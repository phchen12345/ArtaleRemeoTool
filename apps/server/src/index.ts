import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { customAlphabet, nanoid } from "nanoid";
import { createClient } from "redis";
import { WebSocketServer, WebSocket } from "ws";

type RoomStage = {
  id: string;
  label: string;
  cells: (string | null)[];
};

type RoomPlayer = {
  id: string;
  name: string;
  color: string | null;
  isHost: boolean;
};

type Room = {
  id: string;
  code: string;
  password: string | null;
  stages: RoomStage[];
  players: RoomPlayer[];
  createdAt: string;
  updatedAt: string;
  inactiveSince: string | null;
};

type SocketSession = {
  roomCode: string;
  playerId: string;
};

type ClientMessage =
  | {
      type: "create_room";
      payload: {
        playerName: string;
        color: string | null;
        password: string | null;
        stageCount: number;
        cellCount: number;
      };
    }
  | {
      type: "join_room";
      payload: {
        roomCode: string;
        playerName: string;
        password: string | null;
      };
    }
  | {
      type: "update_cell";
      payload: {
        roomCode: string;
        password: string | null;
        stageIndex: number;
        cellIndex: number;
        status: string | null;
      };
    }
  | {
      type: "update_color";
      payload: {
        roomCode: string;
        color: string;
      };
    }
  | {
      type: "reset_room";
      payload: {
        roomCode: string;
        password: string | null;
      };
    };

const PORT = Number(process.env.PORT ?? 8080);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";
const REDIS_URL = process.env.REDIS_URL;
const ROOM_INDEX_KEY = "rooms:index";
const ROOM_KEY_PREFIX = "room:";
const CLEANUP_INTERVAL_MS = 60_000;
const ROOM_STALE_MS = 15 * 60 * 1000;
const MAX_ROOM_PLAYERS = 4;
const DUPLICATE_SELECTION_MESSAGE = "隢?????摮?";
const DUPLICATE_COLOR_MESSAGE = "甇日??脣歇鋡怠隞摰園??";
const PICK_COLOR_FIRST_MESSAGE = "隢??豢?憿";
const CELL_OCCUPIED_MESSAGE = "Cell is already occupied.";
const ROOM_FULL_MESSAGE = "Room is full.";

if (!REDIS_URL) {
  throw new Error("REDIS_URL is required.");
}

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });
const roomCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
const socketSession = new WeakMap<WebSocket, SocketSession>();
const roomSockets = new Map<string, Map<string, WebSocket>>();

const redis = createClient({ url: REDIS_URL });
redis.on("error", (error) => {
  console.error("Redis error", error);
});

app.get("/health", async (_request, response) => {
  try {
    const rooms = await redis.sCard(ROOM_INDEX_KEY);
    response.json({ ok: true, rooms });
  } catch (error) {
    response.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to query Redis."
    });
  }
});

function createStages(stageCount: number, cellCount: number): RoomStage[] {
  return Array.from({ length: stageCount }, (_, index) => ({
    id: nanoid(),
    label: `${stageCount - index}`,
    cells: Array.from({ length: cellCount }, () => null as string | null)
  }));
}

function getRoomKey(code: string) {
  return `${ROOM_KEY_PREFIX}${code}`;
}

function normalizeRoomCode(input: string) {
  return input.trim().toUpperCase();
}

function shouldMarkInactive(playerCount: number) {
  return playerCount <= 1;
}

function updateInactiveSince(room: Room, now = new Date().toISOString()) {
  room.inactiveSince = shouldMarkInactive(room.players.length) ? now : null;
}

function roomSnapshot(room: Room, selfPlayerId: string) {
  return {
    roomId: room.id,
    roomCode: room.code,
    hasPassword: Boolean(room.password),
    selfPlayerId,
    stages: room.stages,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      isHost: player.isHost
    })),
    updatedAt: room.updatedAt
  };
}

function send(socket: WebSocket, message: unknown) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

async function loadRoom(code: string) {
  const raw = await redis.get(getRoomKey(code));
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as Room;
}

async function saveRoom(room: Room) {
  await redis.multi().set(getRoomKey(room.code), JSON.stringify(room)).sAdd(ROOM_INDEX_KEY, room.code).exec();
}

async function deleteRoom(code: string) {
  await redis.multi().del(getRoomKey(code)).sRem(ROOM_INDEX_KEY, code).exec();
  roomSockets.delete(code);
}

function getRoomSocketMap(code: string) {
  let sockets = roomSockets.get(code);
  if (!sockets) {
    sockets = new Map<string, WebSocket>();
    roomSockets.set(code, sockets);
  }

  return sockets;
}

async function broadcastRoom(room: Room) {
  const sockets = getRoomSocketMap(room.code);

  for (const [playerId, socket] of sockets.entries()) {
    if (socket.readyState !== WebSocket.OPEN) {
      sockets.delete(playerId);
      continue;
    }

    send(socket, {
      type: "room_state",
      payload: roomSnapshot(room, playerId)
    });
  }

  if (sockets.size === 0) {
    roomSockets.delete(room.code);
  }
}

function assertPassword(room: Room, password: string | null) {
  if ((room.password ?? null) !== (password ?? null)) {
    throw new Error("Invalid room password.");
  }
}

async function requireSession(socket: WebSocket) {
  const session = socketSession.get(socket);
  if (!session) {
    throw new Error("Join a room before editing the board.");
  }

  const room = await loadRoom(session.roomCode);
  if (!room) {
    throw new Error("Room not found.");
  }

  const player = room.players.find((candidate) => candidate.id === session.playerId);
  if (!player) {
    throw new Error("Player session not found.");
  }

  return { room, player, session };
}

function assertColorAvailable(room: Room, color: string, excludePlayerId?: string) {
  const taken = room.players.some(
    (player) => player.id !== excludePlayerId && player.color === color
  );

  if (taken) {
    throw new Error(DUPLICATE_COLOR_MESSAGE);
  }
}

async function createUniqueRoomCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = roomCode();
    const existingRoom = await loadRoom(code);
    if (!existingRoom) {
      return code;
    }
  }

  throw new Error("Failed to generate a unique room code.");
}

async function handleLeave(socket: WebSocket) {
  const session = socketSession.get(socket);
  if (!session) {
    return;
  }

  socketSession.delete(socket);
  const sockets = roomSockets.get(session.roomCode);
  sockets?.delete(session.playerId);
  if (sockets && sockets.size === 0) {
    roomSockets.delete(session.roomCode);
  }

  const room = await loadRoom(session.roomCode);
  if (!room) {
    return;
  }

  const leavingPlayer = room.players.find((player) => player.id === session.playerId);
  room.players = room.players.filter((player) => player.id !== session.playerId);

  if (room.players.length > 0 && leavingPlayer?.isHost) {
    room.players[0] = { ...room.players[0], isHost: true };
  }

  room.updatedAt = new Date().toISOString();
  updateInactiveSince(room, room.updatedAt);
  await saveRoom(room);
  await broadcastRoom(room);
}

async function cleanupStaleRooms() {
  const roomCodes = await redis.sMembers(ROOM_INDEX_KEY);
  const now = Date.now();

  for (const code of roomCodes) {
    const room = await loadRoom(code);
    if (!room) {
      await redis.sRem(ROOM_INDEX_KEY, code);
      continue;
    }

    if (!room.inactiveSince) {
      continue;
    }

    const inactiveFor = now - new Date(room.inactiveSince).getTime();
    if (inactiveFor >= ROOM_STALE_MS) {
      await deleteRoom(code);
    }
  }
}

wss.on("connection", (socket) => {
  send(socket, { type: "system", payload: { message: "Socket connected." } });

  socket.on("message", async (raw) => {
    try {
      const message = JSON.parse(raw.toString()) as ClientMessage;

      if (message.type === "create_room") {
        const code = await createUniqueRoomCode();
        const playerId = nanoid();
        const now = new Date().toISOString();
        const room: Room = {
          id: nanoid(),
          code,
          password: message.payload.password,
          stages: createStages(message.payload.stageCount, message.payload.cellCount),
          players: [
            {
              id: playerId,
              name: message.payload.playerName,
              color: message.payload.color,
              isHost: true
            }
          ],
          createdAt: now,
          updatedAt: now,
          inactiveSince: now
        };

        socketSession.set(socket, { roomCode: code, playerId });
        getRoomSocketMap(code).set(playerId, socket);
        await saveRoom(room);
        await broadcastRoom(room);
        return;
      }

      if (message.type === "join_room") {
        const code = normalizeRoomCode(message.payload.roomCode);
        const room = await loadRoom(code);
        if (!room) {
          throw new Error("Room not found.");
        }

        assertPassword(room, message.payload.password);

        if (room.players.length >= MAX_ROOM_PLAYERS) {
          throw new Error(ROOM_FULL_MESSAGE);
        }

        const playerId = nanoid();
        room.players.push({
          id: playerId,
          name: message.payload.playerName,
          color: null,
          isHost: false
        });

        room.updatedAt = new Date().toISOString();
        updateInactiveSince(room, room.updatedAt);
        socketSession.set(socket, { roomCode: room.code, playerId });
        getRoomSocketMap(room.code).set(playerId, socket);
        await saveRoom(room);
        await broadcastRoom(room);
        return;
      }

      if (message.type === "update_color") {
        const { room, player } = await requireSession(socket);
        if (room.code !== normalizeRoomCode(message.payload.roomCode)) {
          throw new Error("Room session mismatch.");
        }

        assertColorAvailable(room, message.payload.color, player.id);
        player.color = message.payload.color;
        room.updatedAt = new Date().toISOString();
        await saveRoom(room);
        await broadcastRoom(room);
        return;
      }

      if (message.type === "update_cell") {
        const { room, player } = await requireSession(socket);
        if (room.code !== normalizeRoomCode(message.payload.roomCode)) {
          throw new Error("Room session mismatch.");
        }

        if (!player.color) {
          throw new Error(PICK_COLOR_FIRST_MESSAGE);
        }

        const stage = room.stages[message.payload.stageIndex];
        if (!stage) {
          throw new Error("Stage does not exist.");
        }

        if (message.payload.cellIndex < 0 || message.payload.cellIndex >= stage.cells.length) {
          throw new Error("Cell does not exist.");
        }

        const currentCell = stage.cells[message.payload.cellIndex];

        if (message.payload.status && currentCell && currentCell !== player.color) {
          throw new Error(CELL_OCCUPIED_MESSAGE);
        }

        if (message.payload.status) {
          const occupiedIndex = stage.cells.findIndex(
            (cell, currentCellIndex) =>
              currentCellIndex !== message.payload.cellIndex && cell === player.color
          );

          if (occupiedIndex >= 0) {
            throw new Error(DUPLICATE_SELECTION_MESSAGE);
          }
        }

        stage.cells[message.payload.cellIndex] = message.payload.status;
        room.updatedAt = new Date().toISOString();
        await saveRoom(room);
        await broadcastRoom(room);
        return;
      }

      if (message.type === "reset_room") {
        const { room } = await requireSession(socket);
        if (room.code !== normalizeRoomCode(message.payload.roomCode)) {
          throw new Error("Room session mismatch.");
        }

        room.stages = room.stages.map((stage) => ({
          ...stage,
          cells: stage.cells.map(() => null)
        }));
        room.updatedAt = new Date().toISOString();
        await saveRoom(room);
        await broadcastRoom(room);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected server error.";
      send(socket, { type: "error", payload: { message } });
    }
  });

  socket.on("close", () => {
    void handleLeave(socket);
  });
});

async function main() {
  await redis.connect();
  await cleanupStaleRooms();
  setInterval(() => {
    void cleanupStaleRooms();
  }, CLEANUP_INTERVAL_MS);

  server.listen(PORT, () => {
    console.log(`RJPQ realtime server listening on http://localhost:${PORT}`);
  });
}

void main().catch((error) => {
  console.error("Failed to start realtime server", error);
  process.exit(1);
});

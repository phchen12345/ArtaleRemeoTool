"use client";

import { useEffect, useRef } from "react";
import type { Dispatch } from "react";
import {
  DEFAULT_CELL_COUNT,
  DEFAULT_STAGE_COUNT,
  type RoomGameAction,
  type RoomGameState,
  type RoomState
} from "./roomGameReducer";

type ServerMessage =
  | { type: "room_state"; payload: RoomState }
  | { type: "error"; payload: { message: string } }
  | { type: "system"; payload: { message: string } };

type PendingAction = "create" | "join" | "reset" | null;

const DUPLICATE_SELECTION_MESSAGE = "A player can only select one cell per stage.";
const DUPLICATE_COLOR_MESSAGE = "That color is already taken.";
const PICK_COLOR_FIRST_MESSAGE = "Pick a color first.";
const ROOM_NOT_FOUND_MESSAGE = "Room not found.";
const INVALID_PASSWORD_MESSAGE = "Invalid room password.";
const CELL_OCCUPIED_MESSAGE = "Cell is already occupied.";
const ROOM_FULL_MESSAGE = "Room is full.";

function getWebSocketUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_WS_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.hostname}:8080`;
  }

  return "ws://localhost:8080";
}

type Params = {
  state: RoomGameState;
  dispatch: Dispatch<RoomGameAction>;
  showToast: (message: string) => void;
  passwordRef: React.MutableRefObject<string>;
  roomStateRef: React.MutableRefObject<RoomState | null>;
};

export function useRoomWebSocket({
  state,
  dispatch,
  showToast,
  passwordRef,
  roomStateRef
}: Params) {
  const socketRef = useRef<WebSocket | null>(null);
  const pendingActionRef = useRef<PendingAction>(null);

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  function isSocketReady() {
    return socketRef.current?.readyState === WebSocket.OPEN;
  }

  function connect(message: Record<string, unknown>) {
    socketRef.current?.close();
    const socket = new WebSocket(getWebSocketUrl());
    socketRef.current = socket;

    dispatch({
      type: "patch",
      payload: {
        statusText: "連線中...",
        errorText: "",
        toastMessage: ""
      }
    });

    socket.addEventListener("open", () => {
      dispatch({ type: "patch", payload: { statusText: "已連線" } });
      socket.send(JSON.stringify(message));
    });

    socket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data) as ServerMessage;

      if (data.type === "room_state") {
        dispatch({
          type: "patch",
          payload: {
            roomState: data.payload,
            errorText: "",
            statusText: `已進入房間 ${data.payload.roomCode}`,
            lastActionText: `最後更新 ${new Date(data.payload.updatedAt).toLocaleTimeString()}`
          }
        });

        if (pendingActionRef.current === "create") {
          showToast(`已建立房間 ${data.payload.roomCode}`);
        } else if (pendingActionRef.current === "join") {
          showToast(`已加入房間 ${data.payload.roomCode}`);
        } else if (pendingActionRef.current === "reset") {
          showToast(`房間 ${data.payload.roomCode} 已重置`);
        }

        pendingActionRef.current = null;
        return;
      }

      if (data.type === "error") {
        if (
          data.payload.message === DUPLICATE_SELECTION_MESSAGE ||
          data.payload.message === DUPLICATE_COLOR_MESSAGE ||
          data.payload.message === PICK_COLOR_FIRST_MESSAGE ||
          data.payload.message === ROOM_FULL_MESSAGE
        ) {
          showToast(data.payload.message);
          dispatch({ type: "set_error_text", payload: "" });
        } else if (data.payload.message === ROOM_NOT_FOUND_MESSAGE) {
          dispatch({ type: "set_error_text", payload: data.payload.message });
          showToast("找不到房間");
        } else if (data.payload.message === INVALID_PASSWORD_MESSAGE) {
          dispatch({ type: "set_error_text", payload: data.payload.message });
          showToast("房間密碼錯誤");
        } else {
          dispatch({ type: "set_error_text", payload: data.payload.message });
          showToast(data.payload.message);
        }

        pendingActionRef.current = null;
        dispatch({
          type: "patch",
          payload: { lastActionText: `操作失敗：${data.payload.message}` }
        });
        return;
      }

      dispatch({ type: "patch", payload: { statusText: data.payload.message } });
    });

    socket.addEventListener("error", () => {
      dispatch({
        type: "patch",
        payload: {
          errorText: "WebSocket 連線失敗",
          lastActionText: "連線發生錯誤"
        }
      });
      showToast("WebSocket 連線失敗");
      pendingActionRef.current = null;
    });

    socket.addEventListener("close", () => {
      dispatch({ type: "patch", payload: { statusText: "已中斷連線" } });
    });
  }

  function createRoom() {
    pendingActionRef.current = "create";
    showToast("正在建立房間...");
    connect({
      type: "create_room",
      payload: {
        playerName: state.playerName || "玩家",
        color: state.color,
        password: state.roomPassword || null,
        stageCount: DEFAULT_STAGE_COUNT,
        cellCount: DEFAULT_CELL_COUNT
      }
    });
  }

  function joinRoom() {
    pendingActionRef.current = "join";
    showToast("正在加入房間...");
    connect({
      type: "join_room",
      payload: {
        roomCode: state.roomCodeInput,
        playerName: state.playerName || "玩家",
        password: state.roomPassword || null
      }
    });
  }

  function updatePlayerColor(nextColor: string) {
    const currentRoom = roomStateRef.current;

    if (!currentRoom) {
      dispatch({ type: "set_color", payload: nextColor });
      showToast("已選擇顏色");
      return;
    }

    const occupiedByOther = currentRoom.players.some(
      (player) => player.id !== currentRoom.selfPlayerId && player.color === nextColor
    );
    if (occupiedByOther) {
      showToast(DUPLICATE_COLOR_MESSAGE);
      return;
    }

    dispatch({ type: "set_color", payload: nextColor });
    showToast("已更新顏色");

    if (!isSocketReady()) {
      return;
    }

    dispatch({ type: "update_local_player_color", payload: nextColor });

    socketRef.current?.send(
      JSON.stringify({
        type: "update_color",
        payload: {
          roomCode: currentRoom.roomCode,
          color: nextColor
        }
      })
    );
  }

  function cycleCell(stageIndex: number, cellIndex: number, current: string | null) {
    const currentRoom = roomStateRef.current;
    const nextColor = current === state.color ? null : state.color;

    if (!currentRoom) {
      dispatch({ type: "set_error_text", payload: "請先加入房間再操作棋盤。" });
      return;
    }

    if (!state.color) {
      showToast(PICK_COLOR_FIRST_MESSAGE);
      return;
    }

    if (!isSocketReady()) {
      dispatch({
        type: "set_error_text",
        payload: "目前未連線到房間，請重新加入後再試一次。"
      });
      return;
    }

    if (nextColor) {
      const currentCell = currentRoom.stages[stageIndex]?.cells[cellIndex];

      if (currentCell && currentCell !== state.color) {
        showToast(CELL_OCCUPIED_MESSAGE);
        dispatch({
          type: "patch",
          payload: {
            errorText: "",
            lastActionText: `第 ${DEFAULT_STAGE_COUNT - stageIndex} 層第 ${cellIndex + 1} 格已被佔用`
          }
        });
        return;
      }

      const occupiedIndex = currentRoom.stages[stageIndex]?.cells.findIndex(
        (cell, currentCellIndex) => currentCellIndex !== cellIndex && cell === nextColor
      );

      if (occupiedIndex !== undefined && occupiedIndex >= 0) {
        showToast(DUPLICATE_SELECTION_MESSAGE);
        dispatch({
          type: "patch",
          payload: {
            errorText: "",
            lastActionText: `第 ${DEFAULT_STAGE_COUNT - stageIndex} 層已選過第 ${occupiedIndex + 1} 格`
          }
        });
        return;
      }
    }

    dispatch({
      type: "patch",
      payload: {
        errorText: "",
        lastActionText: nextColor
          ? `已標記第 ${DEFAULT_STAGE_COUNT - stageIndex} 層第 ${cellIndex + 1} 格`
          : `已清除第 ${DEFAULT_STAGE_COUNT - stageIndex} 層第 ${cellIndex + 1} 格`
      }
    });

    dispatch({
      type: "update_local_cell",
      payload: { stageIndex, cellIndex, nextColor }
    });

    socketRef.current?.send(
      JSON.stringify({
        type: "update_cell",
        payload: {
          roomCode: currentRoom.roomCode,
          password: passwordRef.current || null,
          stageIndex,
          cellIndex,
          status: nextColor
        }
      })
    );
  }

  function resetBoard() {
    const currentRoom = roomStateRef.current;
    if (!currentRoom || !isSocketReady()) {
      showToast("請先加入房間再重置棋盤。");
      return;
    }

    pendingActionRef.current = "reset";
    showToast("正在重置棋盤...");
    dispatch({ type: "patch", payload: { lastActionText: "正在送出重置請求" } });
    dispatch({ type: "reset_local_board" });

    socketRef.current?.send(
      JSON.stringify({
        type: "reset_room",
        payload: {
          roomCode: currentRoom.roomCode,
          password: passwordRef.current || null
        }
      })
    );
  }

  function leaveRoom() {
    socketRef.current?.close();
    socketRef.current = null;
    pendingActionRef.current = null;
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("room");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
    dispatch({ type: "leave_room" });
    showToast("已離開房間");
  }

  return {
    createRoom,
    joinRoom,
    updatePlayerColor,
    cycleCell,
    resetBoard,
    leaveRoom
  };
}

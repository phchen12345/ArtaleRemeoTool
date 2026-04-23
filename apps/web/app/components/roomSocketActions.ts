"use client";

import type { Dispatch, MutableRefObject } from "react";
import {
  DEFAULT_CELL_COUNT,
  DEFAULT_STAGE_COUNT,
  type RoomGameAction,
  type RoomGameState,
  type RoomState
} from "./roomGameReducer";
import {
  CELL_OCCUPIED_MESSAGE,
  DUPLICATE_COLOR_MESSAGE,
  DUPLICATE_SELECTION_MESSAGE,
  PICK_COLOR_FIRST_MESSAGE,
  STATUS_CONNECTED,
  STATUS_CONNECTING,
  TOAST_COLOR_SAVED,
  TOAST_COLOR_SELECTED,
  TOAST_CREATING_ROOM,
  TOAST_JOINING_ROOM,
  TOAST_LEFT_ROOM,
  TOAST_RESETTING_ROOM,
  type PendingAction,
  type ServerMessage
} from "./roomSocketConstants";

type SocketApi = {
  connect: (
    message: Record<string, unknown>,
    handlers: {
      onMessage: (message: ServerMessage) => void;
      onError: () => void;
      onClose: () => void;
    },
    onOpen?: () => void
  ) => void;
  send: (message: Record<string, unknown>) => void;
  close: () => void;
  isReady: () => boolean;
};

type Params = {
  state: RoomGameState;
  dispatch: Dispatch<RoomGameAction>;
  showToast: (message: string) => void;
  passwordRef: MutableRefObject<string>;
  roomStateRef: MutableRefObject<RoomState | null>;
  pendingActionRef: MutableRefObject<PendingAction>;
  socket: SocketApi;
  messageHandlers: {
    handleMessage: (message: ServerMessage) => void;
    handleSocketError: () => void;
    handleSocketClose: () => void;
  };
};

export function createRoomSocketActions({
  state,
  dispatch,
  showToast,
  passwordRef,
  roomStateRef,
  pendingActionRef,
  socket,
  messageHandlers
}: Params) {
  function connectToRoom(message: Record<string, unknown>) {
    dispatch({
      type: "patch",
      payload: {
        statusText: STATUS_CONNECTING,
        errorText: "",
        toastMessage: ""
      }
    });

    socket.connect(
      message,
      {
        onMessage: messageHandlers.handleMessage,
        onError: messageHandlers.handleSocketError,
        onClose: messageHandlers.handleSocketClose
      },
      () => {
        dispatch({ type: "patch", payload: { statusText: STATUS_CONNECTED } });
      }
    );
  }

  function createRoom() {
    pendingActionRef.current = "create";
    showToast(TOAST_CREATING_ROOM);
    connectToRoom({
      type: "create_room",
      payload: {
        playerName: state.playerName.trim() || "玩家",
        color: state.color,
        password: state.roomPassword || null,
        stageCount: DEFAULT_STAGE_COUNT,
        cellCount: DEFAULT_CELL_COUNT
      }
    });
  }

  function joinRoom() {
    pendingActionRef.current = "join";
    showToast(TOAST_JOINING_ROOM);
    connectToRoom({
      type: "join_room",
      payload: {
        roomCode: state.roomCodeInput,
        playerName: state.playerName.trim() || "玩家",
        password: state.roomPassword || null
      }
    });
  }

  function updatePlayerColor(nextColor: string) {
    const currentRoom = roomStateRef.current;

    if (!currentRoom) {
      dispatch({ type: "set_color", payload: nextColor });
      showToast(TOAST_COLOR_SELECTED);
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
    showToast(TOAST_COLOR_SAVED);

    if (!socket.isReady()) {
      return;
    }

    dispatch({ type: "update_local_player_color", payload: nextColor });
    socket.send({
      type: "update_color",
      payload: {
        roomCode: currentRoom.roomCode,
        color: nextColor
      }
    });
  }

  function cycleCell(stageIndex: number, cellIndex: number, current: string | null) {
    const currentRoom = roomStateRef.current;
    const nextColor = current === state.color ? null : state.color;

    if (!currentRoom) {
      dispatch({ type: "set_error_text", payload: "請先加入房間再操作格子" });
      return;
    }

    if (!state.color) {
      showToast(PICK_COLOR_FIRST_MESSAGE);
      return;
    }

    if (!socket.isReady()) {
      dispatch({ type: "set_error_text", payload: "尚未連上房間伺服器，請稍後再試" });
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
            lastActionText: `第 ${DEFAULT_STAGE_COUNT - stageIndex} 關第 ${cellIndex + 1} 格已被佔用`
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
            lastActionText: `第 ${DEFAULT_STAGE_COUNT - stageIndex} 關已選在第 ${occupiedIndex + 1} 格`
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
          ? `已選取第 ${DEFAULT_STAGE_COUNT - stageIndex} 關第 ${cellIndex + 1} 格`
          : `已取消第 ${DEFAULT_STAGE_COUNT - stageIndex} 關第 ${cellIndex + 1} 格`
      }
    });

    dispatch({
      type: "update_local_cell",
      payload: { stageIndex, cellIndex, nextColor }
    });

    socket.send({
      type: "update_cell",
      payload: {
        roomCode: currentRoom.roomCode,
        password: passwordRef.current || null,
        stageIndex,
        cellIndex,
        status: nextColor
      }
    });
  }

  function resetBoard() {
    const currentRoom = roomStateRef.current;
    if (!currentRoom || !socket.isReady()) {
      showToast("請先加入房間並完成連線");
      return;
    }

    pendingActionRef.current = "reset";
    showToast(TOAST_RESETTING_ROOM);
    dispatch({ type: "patch", payload: { lastActionText: "正在重置房間棋盤" } });
    dispatch({ type: "reset_local_board" });

    socket.send({
      type: "reset_room",
      payload: {
        roomCode: currentRoom.roomCode,
        password: passwordRef.current || null
      }
    });
  }

  function leaveRoom() {
    socket.close();
    pendingActionRef.current = null;

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("room");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }

    dispatch({ type: "leave_room" });
    showToast(TOAST_LEFT_ROOM);
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

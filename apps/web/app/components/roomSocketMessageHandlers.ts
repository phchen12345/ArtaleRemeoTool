"use client";

import type { Dispatch, MutableRefObject } from "react";
import type { RoomGameAction, RoomState } from "./roomGameReducer";
import {
  CELL_OCCUPIED_MESSAGE,
  DUPLICATE_COLOR_MESSAGE,
  DUPLICATE_SELECTION_MESSAGE,
  INVALID_PASSWORD_MESSAGE,
  PICK_COLOR_FIRST_MESSAGE,
  ROOM_FULL_MESSAGE,
  ROOM_NOT_FOUND_MESSAGE,
  STATUS_DISCONNECTED,
  TOAST_SOCKET_ERROR,
  type PendingAction,
  type ServerMessage
} from "./roomSocketConstants";

type Params = {
  dispatch: Dispatch<RoomGameAction>;
  pendingActionRef: MutableRefObject<PendingAction>;
  showToast: (message: string) => void;
};

export function createRoomSocketMessageHandlers({
  dispatch,
  pendingActionRef,
  showToast
}: Params) {
  function handleRoomState(payload: RoomState) {
    dispatch({
      type: "patch",
      payload: {
        roomState: payload,
        errorText: "",
        statusText: `已進入房間 ${payload.roomCode}`,
        lastActionText: `最後更新 ${new Date(payload.updatedAt).toLocaleTimeString()}`
      }
    });

    if (pendingActionRef.current === "create") {
      showToast(`已建立房間 ${payload.roomCode}`);
    } else if (pendingActionRef.current === "join") {
      showToast(`已加入房間 ${payload.roomCode}`);
    } else if (pendingActionRef.current === "reset") {
      showToast(`房間 ${payload.roomCode} 已重置`);
    }

    pendingActionRef.current = null;
  }

  function handleError(message: string) {
    if (
      message === DUPLICATE_SELECTION_MESSAGE ||
      message === DUPLICATE_COLOR_MESSAGE ||
      message === PICK_COLOR_FIRST_MESSAGE ||
      message === ROOM_FULL_MESSAGE ||
      message === CELL_OCCUPIED_MESSAGE
    ) {
      showToast(message);
      dispatch({ type: "set_error_text", payload: "" });
    } else if (message === ROOM_NOT_FOUND_MESSAGE) {
      dispatch({ type: "set_error_text", payload: message });
      showToast("找不到指定房間");
    } else if (message === INVALID_PASSWORD_MESSAGE) {
      dispatch({ type: "set_error_text", payload: message });
      showToast("房間密碼錯誤");
    } else {
      dispatch({ type: "set_error_text", payload: message });
      showToast(message);
    }

    pendingActionRef.current = null;
    dispatch({
      type: "patch",
      payload: { lastActionText: `操作失敗：${message}` }
    });
  }

  function handleSystem(message: string) {
    dispatch({ type: "patch", payload: { statusText: message } });
  }

  function handleMessage(data: ServerMessage) {
    if (data.type === "room_state") {
      handleRoomState(data.payload);
      return;
    }

    if (data.type === "error") {
      handleError(data.payload.message);
      return;
    }

    handleSystem(data.payload.message);
  }

  function handleSocketError() {
    dispatch({
      type: "patch",
      payload: {
        errorText: TOAST_SOCKET_ERROR,
        lastActionText: "無法連線到房間伺服器"
      }
    });
    showToast(TOAST_SOCKET_ERROR);
    pendingActionRef.current = null;
  }

  function handleSocketClose() {
    dispatch({ type: "patch", payload: { statusText: STATUS_DISCONNECTED } });
  }

  return {
    handleMessage,
    handleSocketError,
    handleSocketClose
  };
}

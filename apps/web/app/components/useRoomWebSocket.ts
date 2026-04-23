"use client";

import { useRef } from "react";
import type { Dispatch } from "react";
import type { RoomGameAction, RoomGameState, RoomState } from "./roomGameReducer";
import { createRoomSocketActions } from "./roomSocketActions";
import { createRoomSocketMessageHandlers } from "./roomSocketMessageHandlers";
import type { PendingAction } from "./roomSocketConstants";
import { useWebSocketConnection } from "./useWebSocketConnection";

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
  const pendingActionRef = useRef<PendingAction>(null);
  const socket = useWebSocketConnection();
  const messageHandlers = createRoomSocketMessageHandlers({
    dispatch,
    pendingActionRef,
    showToast
  });

  return createRoomSocketActions({
    state,
    dispatch,
    showToast,
    passwordRef,
    roomStateRef,
    pendingActionRef,
    socket,
    messageHandlers
  });
}

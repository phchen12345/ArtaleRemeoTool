"use client";

import { useEffect, useReducer, useRef } from "react";
import { useInviteLink } from "./useInviteLink";
import { useRoomDerivedState } from "./useRoomDerivedState";
import { useRoomUrlSync } from "./useRoomUrlSync";
import { useRoomWebSocket } from "./useRoomWebSocket";
import { useToastMessage } from "./useToastMessage";
import {
  initialRoomGameState,
  roomGameReducer,
  type RoomGameAction,
  type RoomState
} from "../lib/room/roomGameReducer";

export { COLORS } from "../lib/room/roomGameReducer";

export function useRoomGame() {
  const [state, dispatch] = useReducer(roomGameReducer, initialRoomGameState);
  const passwordRef = useRef("");
  const roomStateRef = useRef<RoomState | null>(null);

  useRoomUrlSync({
    roomCodeInput: state.roomCodeInput,
    roomState: state.roomState,
    dispatch
  });

  useInviteLink({
    roomState: state.roomState,
    dispatch
  });

  useEffect(() => {
    passwordRef.current = state.roomPassword;
  }, [state.roomPassword]);

  useEffect(() => {
    roomStateRef.current = state.roomState;
  }, [state.roomState]);

  const { showToast } = useToastMessage({
    onShow: (message) => dispatch({ type: "set_toast_message", payload: message }),
    onClear: () => dispatch({ type: "set_toast_message", payload: "" })
  });

  const { createRoom, joinRoom, updatePlayerColor, cycleCell, resetBoard, leaveRoom } =
    useRoomWebSocket({
      state,
      dispatch: dispatch as React.Dispatch<RoomGameAction>,
      showToast,
      passwordRef,
      roomStateRef
    });

  const derivedState = useRoomDerivedState(state);

  function copyInviteLink() {
    if (!state.inviteLink) {
      showToast("目前沒有可複製的邀請連結");
      return;
    }

    navigator.clipboard.writeText(state.inviteLink);
    showToast("已複製邀請連結");
  }

  return {
    state,
    ...derivedState,
    setPlayerName: (value: string) => dispatch({ type: "set_player_name", payload: value }),
    setRoomPassword: (value: string) => dispatch({ type: "set_room_password", payload: value }),
    setRoomCodeInput: (value: string) =>
      dispatch({ type: "set_room_code_input", payload: value.toUpperCase() }),
    createRoom,
    joinRoom,
    updatePlayerColor,
    cycleCell,
    resetBoard,
    leaveRoom,
    copyInviteLink
  };
}

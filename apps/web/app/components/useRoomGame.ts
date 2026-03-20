"use client";

import { useEffect, useReducer, useRef } from "react";
import {
  initialRoomGameState,
  initialStages,
  roomGameReducer,
  type RoomGameAction,
  type RoomState
} from "./roomGameReducer";
import { useRoomWebSocket } from "./useRoomWebSocket";

export { COLORS } from "./roomGameReducer";

export function useRoomGame() {
  const [state, dispatch] = useReducer(roomGameReducer, initialRoomGameState);
  const passwordRef = useRef("");
  const roomStateRef = useRef<RoomState | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) {
      dispatch({ type: "set_room_code_input", payload: room.toUpperCase() });
    }
  }, []);

  useEffect(() => {
    passwordRef.current = state.roomPassword;
  }, [state.roomPassword]);

  useEffect(() => {
    roomStateRef.current = state.roomState;
  }, [state.roomState]);

  useEffect(() => {
    if (!state.roomState) {
      dispatch({ type: "patch", payload: { inviteLink: "" } });
      return;
    }

    const selfPlayer = state.roomState.players.find(
      (player) => player.id === state.roomState?.selfPlayerId
    );

    const url = new URL(window.location.href);
    url.searchParams.set("room", state.roomState.roomCode);

    dispatch({
      type: "patch",
      payload: {
        color: selfPlayer?.color ?? null,
        inviteLink: url.toString()
      }
    });
  }, [state.roomState]);

  useEffect(() => {
    const nextRoomCode = state.roomState?.roomCode ?? state.roomCodeInput.trim();
    const url = new URL(window.location.href);

    if (nextRoomCode) {
      url.searchParams.set("room", nextRoomCode);
    } else {
      url.searchParams.delete("room");
    }

    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [state.roomCodeInput, state.roomState?.roomCode]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showToast(message: string) {
    dispatch({ type: "set_toast_message", payload: message });

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      dispatch({ type: "set_toast_message", payload: "" });
      toastTimerRef.current = null;
    }, 1800);
  }

  const { createRoom, joinRoom, updatePlayerColor, cycleCell, resetBoard } = useRoomWebSocket({
    state,
    dispatch: dispatch as React.Dispatch<RoomGameAction>,
    showToast,
    passwordRef,
    roomStateRef
  });

  function copyInviteLink() {
    if (!state.inviteLink) {
      showToast("目前還沒有可分享的邀請連結。");
      return;
    }

    navigator.clipboard.writeText(state.inviteLink);
    showToast("已複製邀請連結。");
  }

  return {
    state,
    activeStages: state.roomState?.stages ?? initialStages,
    occupiedColors: new Set(
      (state.roomState?.players ?? [])
        .filter((player) => player.id !== state.roomState?.selfPlayerId)
        .map((player) => player.color)
        .filter((playerColor): playerColor is string => Boolean(playerColor))
    ),
    setPlayerName: (value: string) => dispatch({ type: "set_player_name", payload: value }),
    setRoomPassword: (value: string) => dispatch({ type: "set_room_password", payload: value }),
    setRoomCodeInput: (value: string) =>
      dispatch({ type: "set_room_code_input", payload: value.toUpperCase() }),
    createRoom,
    joinRoom,
    updatePlayerColor,
    cycleCell,
    resetBoard,
    copyInviteLink
  };
}

"use client";

import { useEffect } from "react";
import type { Dispatch } from "react";
import type { RoomGameAction, RoomState } from "../lib/room/roomGameReducer";

type Params = {
  roomCodeInput: string;
  roomState: RoomState | null;
  dispatch: Dispatch<RoomGameAction>;
};

export function useRoomUrlSync({ roomCodeInput, roomState, dispatch }: Params) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) {
      dispatch({ type: "set_room_code_input", payload: room.toUpperCase() });
    }
  }, [dispatch]);

  useEffect(() => {
    const nextRoomCode = roomState?.roomCode ?? roomCodeInput.trim();
    const url = new URL(window.location.href);

    if (nextRoomCode) {
      url.searchParams.set("room", nextRoomCode);
    } else {
      url.searchParams.delete("room");
    }

    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [roomCodeInput, roomState?.roomCode]);
}

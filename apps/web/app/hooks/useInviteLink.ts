"use client";

import { useEffect } from "react";
import type { Dispatch } from "react";
import type { RoomGameAction, RoomState } from "../lib/room/roomGameReducer";

type Params = {
  roomState: RoomState | null;
  dispatch: Dispatch<RoomGameAction>;
};

export function useInviteLink({ roomState, dispatch }: Params) {
  useEffect(() => {
    if (!roomState) {
      dispatch({ type: "patch", payload: { inviteLink: "" } });
      return;
    }

    const selfPlayer = roomState.players.find((player) => player.id === roomState.selfPlayerId);
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomState.roomCode);

    dispatch({
      type: "patch",
      payload: {
        color: selfPlayer?.color ?? null,
        inviteLink: url.toString()
      }
    });
  }, [dispatch, roomState]);
}

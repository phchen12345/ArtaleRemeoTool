"use client";

import { initialStages, type RoomGameState } from "../lib/room/roomGameReducer";

export function useRoomDerivedState(state: RoomGameState) {
  return {
    activeStages: state.roomState?.stages ?? initialStages,
    occupiedColors: new Set(
      (state.roomState?.players ?? [])
        .filter((player) => player.id !== state.roomState?.selfPlayerId)
        .map((player) => player.color)
        .filter((playerColor): playerColor is string => Boolean(playerColor))
    )
  };
}

"use client";

import type { FormEvent } from "react";
import styles from "../../page.module.css";
import { useRoomGame } from "../../hooks/useRoomGame";
import { RoomBoard } from "./RoomBoard";
import { RoomFooter } from "./RoomFooter";
import { RoomForms } from "./RoomForms";
import { RoomHeader } from "./RoomHeader";
import { RoomToast } from "./RoomToast";

export default function HomePageClient() {
  const {
    state,
    activeStages,
    occupiedColors,
    setPlayerName,
    setRoomPassword,
    setRoomCodeInput,
    createRoom,
    joinRoom,
    updatePlayerColor,
    cycleCell,
    resetBoard,
    leaveRoom,
    copyInviteLink
  } = useRoomGame();

  function onCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createRoom();
  }

  function onJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    joinRoom();
  }

  function onLeaveRoom() {
    if (!window.confirm("確定要離開房間嗎？")) {
      return;
    }

    leaveRoom();
  }

  return (
    <main className={styles.page}>
      <RoomToast message={state.toastMessage} />

      <section className={styles.frame}>
        <section className={styles.controlPanel}>
          <RoomHeader
            state={state}
            occupiedColors={occupiedColors}
            copyInviteLink={copyInviteLink}
            updatePlayerColor={updatePlayerColor}
          />
          <RoomForms
            state={state}
            setPlayerName={setPlayerName}
            setRoomPassword={setRoomPassword}
            setRoomCodeInput={setRoomCodeInput}
            onCreateRoom={onCreateRoom}
            onJoinRoom={onJoinRoom}
            onLeaveRoom={onLeaveRoom}
            resetBoard={resetBoard}
          />
        </section>

        <section className={styles.boardPanel}>
          <RoomBoard activeStages={activeStages} cycleCell={cycleCell} />
          <RoomFooter state={state} />
        </section>
      </section>
    </main>
  );
}

"use client";

import styles from "../../page.module.css";
import type { RoomGameState } from "../../lib/room/roomGameReducer";

function getDisplayPlayerName(name: string) {
  const generatedName = /^user(\d+)$/i.exec(name);
  return generatedName ? `?拙振 ${generatedName[1]}` : name;
}

type Props = {
  state: RoomGameState;
};

export function RoomFooter({ state }: Props) {
  return (
    <footer className={styles.footer}>
      <div className={styles.meta}>
        <span>{state.statusText}</span>
        <span>{state.lastActionText}</span>
        {state.errorText ? <span className={styles.error}>{state.errorText}</span> : null}
      </div>
      <div className={styles.party}>
        {state.roomState?.players.map((player) => (
          <div key={player.id} className={styles.playerBadge}>
            <span
              className={styles.playerDot}
              style={{ backgroundColor: player.color ?? "#5c5f72" }}
            />
            <span>{getDisplayPlayerName(player.name)}</span>
          </div>
        ))}
      </div>
    </footer>
  );
}

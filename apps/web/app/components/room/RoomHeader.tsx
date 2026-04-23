"use client";

import styles from "../../page.module.css";
import { COLORS, type RoomGameState } from "../../lib/room/roomGameReducer";

type Props = {
  state: RoomGameState;
  occupiedColors: Set<string>;
  copyInviteLink: () => void;
  updatePlayerColor: (nextColor: string) => void;
};

export function RoomHeader({
  state,
  occupiedColors,
  copyInviteLink,
  updatePlayerColor
}: Props) {
  return (
    <header className={styles.topBar}>
      <div className={styles.roomInfo}>
        <div className={styles.roomInfoRow}>
          <span className={styles.infoLabel}>房號：</span>
          <strong>{state.roomState?.roomCode ?? state.roomCodeInput ?? "------"}</strong>
        </div>
        <div className={styles.roomInfoRow}>
          <span className={styles.infoLabel}>密碼：</span>
          <strong>{state.roomPassword || (state.roomState?.hasPassword ? "已設定" : "未設定")}</strong>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={copyInviteLink}
          aria-label="複製邀請連結"
        >
          邀請
        </button>
        <div className={styles.palette} aria-label="選擇顏色">
          {COLORS.map((option, index) => {
            const occupied = occupiedColors.has(option);
            const selected = option === state.color;

            return (
              <button
                key={option}
                type="button"
                className={selected ? styles.paletteActive : styles.paletteButton}
                style={{ backgroundColor: option }}
                onClick={() => updatePlayerColor(option)}
                aria-label={`選擇顏色 ${index + 1}`}
              >
                {occupied ? <span className={styles.paletteLock}>已用</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

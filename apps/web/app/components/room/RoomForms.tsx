"use client";

import type { FormEvent } from "react";
import styles from "../../page.module.css";
import type { RoomGameState } from "../../lib/room/roomGameReducer";

type Props = {
  state: RoomGameState;
  setPlayerName: (value: string) => void;
  setRoomPassword: (value: string) => void;
  setRoomCodeInput: (value: string) => void;
  onCreateRoom: (event: FormEvent<HTMLFormElement>) => void;
  onJoinRoom: (event: FormEvent<HTMLFormElement>) => void;
  onLeaveRoom: () => void;
  resetBoard: () => void;
};

export function RoomForms({
  state,
  setPlayerName,
  setRoomPassword,
  setRoomCodeInput,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  resetBoard
}: Props) {
  return (
    <div className={styles.quickBar}>
      {state.roomState ? (
        <div className={styles.formSection}>
          <p className={styles.formTitle}>房間操作</p>
          <div className={styles.roomActions}>
            <button type="button" className={styles.secondaryButton} onClick={resetBoard}>
              重置棋盤
            </button>
            <button type="button" className={styles.dangerWideButton} onClick={onLeaveRoom}>
              離開房間
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.formSection}>
            <p className={styles.formTitle}>建立房間</p>
            <form className={styles.inlineForm} onSubmit={onCreateRoom}>
              <input
                value={state.playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="玩家名稱"
              />
              <input
                value={state.roomPassword}
                onChange={(event) => setRoomPassword(event.target.value)}
                placeholder="房間密碼"
                type="password"
              />
              <button type="submit" className={styles.dangerButton}>
                建立
              </button>
            </form>
          </div>

          <div className={styles.formSection}>
            <p className={styles.formTitle}>加入房間</p>
            <form className={styles.joinForm} onSubmit={onJoinRoom}>
              <input
                value={state.roomCodeInput}
                onChange={(event) => setRoomCodeInput(event.target.value)}
                placeholder="房號"
              />
              <input
                value={state.roomPassword}
                onChange={(event) => setRoomPassword(event.target.value)}
                placeholder="房間密碼"
                type="password"
              />
              <div className={styles.joinActions}>
                <button type="submit" className={styles.primaryButton}>
                  加入
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

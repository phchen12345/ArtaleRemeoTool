"use client";

import { FormEvent } from "react";
import styles from "../page.module.css";
import { COLORS, useRoomGame } from "./useRoomGame";

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
      {state.toastMessage ? (
        <div className={styles.toastViewport} role="status" aria-live="polite">
          <div className={styles.toastCard} role="alert">
            <div className={styles.toastIcon} aria-hidden="true">
              !
            </div>
            <div className={styles.toastCopy}>
              <strong>{state.toastMessage}</strong>
            </div>
            <div className={styles.toastProgress} />
          </div>
        </div>
      ) : null}

      <section className={styles.frame}>
        <section className={styles.controlPanel}>
          <header className={styles.topBar}>
            <div className={styles.roomInfo}>
              <div className={styles.roomInfoRow}>
                <span className={styles.infoLabel}>房號：</span>
                <strong>{state.roomState?.roomCode ?? state.roomCodeInput ?? "------"}</strong>
              </div>
              <div className={styles.roomInfoRow}>
                <span className={styles.infoLabel}>密碼：</span>
                <strong>
                  {state.roomPassword || (state.roomState?.hasPassword ? "已設定" : "未設定")}
                </strong>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={copyInviteLink}
                aria-label="複製邀請連結"
              >
                <span className={styles.copyIcon} />
              </button>
              <div className={styles.palette}>
                {COLORS.map((option) => {
                  const occupied = occupiedColors.has(option);
                  const selected = option === state.color;

                  return (
                    <button
                      key={option}
                      type="button"
                      className={selected ? styles.paletteActive : styles.paletteButton}
                      style={{ backgroundColor: option }}
                      onClick={() => updatePlayerColor(option)}
                      aria-label={`選擇顏色 ${option}`}
                    >
                      {occupied ? <span className={styles.paletteLock}>x</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

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
        </section>

        <section className={styles.boardPanel}>
          <section className={styles.board}>
            {activeStages.map((stage, stageIndex) => (
              <div key={stage.id} className={styles.row}>
                <div className={styles.layerTag}>{stage.label}</div>
                <div className={styles.cells}>
                  {stage.cells.map((cell, cellIndex) => (
                    <button
                      key={`${stage.id}-${cellIndex}`}
                      type="button"
                      className={styles.cell}
                      style={{ backgroundColor: cell ?? "var(--cell-idle)" }}
                      onClick={() => cycleCell(stageIndex, cellIndex, cell)}
                    >
                      {cellIndex + 1}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

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
                  <span>{player.name}</span>
                </div>
              ))}
            </div>
          </footer>
        </section>
      </section>
    </main>
  );
}

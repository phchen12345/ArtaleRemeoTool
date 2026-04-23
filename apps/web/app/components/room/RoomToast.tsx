"use client";

import styles from "../../page.module.css";

type Props = {
  message: string;
};

export function RoomToast({ message }: Props) {
  if (!message) {
    return null;
  }

  return (
    <div className={styles.toastViewport} role="status" aria-live="polite">
      <div className={styles.toastCard} role="alert">
        <div className={styles.toastIcon} aria-hidden="true">
          !
        </div>
        <div className={styles.toastCopy}>
          <strong>{message}</strong>
        </div>
        <div className={styles.toastProgress} />
      </div>
    </div>
  );
}

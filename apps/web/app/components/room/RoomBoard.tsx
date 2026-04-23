"use client";

import styles from "../../page.module.css";
import type { RoomStage } from "../../lib/room/roomGameReducer";

type Props = {
  activeStages: RoomStage[];
  cycleCell: (stageIndex: number, cellIndex: number, current: string | null) => void;
};

export function RoomBoard({ activeStages, cycleCell }: Props) {
  return (
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
  );
}

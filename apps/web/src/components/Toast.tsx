import { CheckCircleIcon } from "@phosphor-icons/react";

import styles from "./Toast.module.css";

/**
 * A brief confirmation pinned to the bottom of the screen. The caller owns
 * when it shows and hides; give it a new `key` per message so the entrance
 * animation replays.
 */
export function Toast({ message }: { message: string }) {
  return (
    <div className={styles.Toast} role="status">
      <CheckCircleIcon size={20} weight="fill" />
      {message}
    </div>
  );
}

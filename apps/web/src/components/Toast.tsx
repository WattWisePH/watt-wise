import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";

import styles from "./Toast.module.css";

/**
 * A brief confirmation pinned to the bottom of the screen. The caller owns
 * when it shows and hides; give it a new `key` per message so the entrance
 * animation replays.
 */
export function Toast({ message, error = false }: { message: string; error?: boolean }) {
  const Icon = error ? WarningCircleIcon : CheckCircleIcon;
  return (
    <div className={styles.Toast} role="status">
      <Icon size={20} weight="fill" />
      {message}
    </div>
  );
}

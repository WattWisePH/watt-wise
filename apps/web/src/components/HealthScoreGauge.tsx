import { HeartIcon } from "@phosphor-icons/react";
import styles from "./HealthScoreGauge.module.css";
import duotone from "../styles/DuotoneIcon.module.css";

export type HealthScoreLabel = "Good" | "Fair" | "Poor";

const LABEL_STYLES: Record<HealthScoreLabel, string> = {
  Good: styles.HealthScoreGauge__good,
  Fair: styles.HealthScoreGauge__fair,
  Poor: styles.HealthScoreGauge__poor,
};

const LABEL_ICON_COLORS: Record<HealthScoreLabel, string> = {
  Good: duotone.green,
  Fair: duotone.amber,
  Poor: duotone.red,
};

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface HealthScoreGaugeProps {
  score: number;
  label: HealthScoreLabel;
  showTitle?: boolean;
  showScore?: boolean;
  showLabel?: boolean;
  size?: number;
  insight?: string;
}

export function HealthScoreGauge({
  score,
  label,
  showTitle = true,
  showScore = true,
  showLabel = true,
  size = 84,
  insight,
}: HealthScoreGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const offset = CIRCUMFERENCE * (1 - clampedScore / 100);

  return (
    <div className={`${styles.HealthScoreGauge} ${LABEL_STYLES[label]}`}>
      <div className={styles.HealthScoreGauge_body}>
        <div className={styles.HealthScoreGauge_ring}>
          <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            className={styles.HealthScoreGauge_svg}
          >
            <circle
              className={styles.HealthScoreGauge_track}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth="10"
            />
            <circle
              className={styles.HealthScoreGauge_progress}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <HeartIcon
            className={`${LABEL_ICON_COLORS[label]} ${styles.HealthScoreGauge_icon}`}
          />
        </div>

        <div className={styles.HealthScoreGauge_info}>
          {showTitle && (
            <div className={styles.HealthScoreGauge_header}>
              <h3
                className={`${styles.HealthScoreGauge_title} ${showScore ? styles.HealthScoreGauge_title__scoreShown : ""}`}
              >
                Energy Health Score
              </h3>
            </div>
          )}
          <div className={styles.HealthScoreGauge_valueRow}>
            {showScore && (
              <p className={styles.HealthScoreGauge_value}>{clampedScore}%</p>
            )}
            {showLabel && (
              <div className={styles.HealthScoreGauge_badge}>{label}</div>
            )}
          </div>
          {insight && (
            <p className={styles.HealthScoreGauge_insight}>{insight}</p>
          )}
        </div>
      </div>
    </div>
  );
}

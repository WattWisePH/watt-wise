import { Link } from "react-router";
import { ArrowCircleRightIcon, HeartIcon } from "@phosphor-icons/react";
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
  /**
   * Leave score and label off when there's no score yet: the gauge renders
   * empty and neutral, with `insight` saying why and `action` the way on.
   */
  score?: number;
  label?: HealthScoreLabel;
  showTitle?: boolean;
  showScore?: boolean;
  showLabel?: boolean;
  size?: number;
  insight?: string;
  /** A button under the gauge linking to the next step. */
  action?: { to: string; label: string };
}

export function HealthScoreGauge({
  score,
  label,
  showTitle = true,
  showScore = true,
  showLabel = true,
  size = 84,
  insight,
  action,
}: HealthScoreGaugeProps) {
  const empty = score === undefined || label === undefined;
  const clampedScore = empty ? 0 : Math.max(0, Math.min(100, score));
  const offset = CIRCUMFERENCE * (1 - clampedScore / 100);

  return (
    <div
      className={`${styles.HealthScoreGauge} ${
        empty ? styles.HealthScoreGauge__empty : LABEL_STYLES[label]
      }`}
    >
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
            className={`${empty ? duotone.neutral : LABEL_ICON_COLORS[label]} ${styles.HealthScoreGauge_icon}`}
          />
        </div>

        <div className={styles.HealthScoreGauge_info}>
          {showTitle && (
            <div className={styles.HealthScoreGauge_header}>
              <h3 className={`${styles.HealthScoreGauge_title}`}>
                Energy Health Score
              </h3>
            </div>
          )}
          {!empty && (
            <div className={styles.HealthScoreGauge_valueRow}>
              {showScore && (
                <p className={styles.HealthScoreGauge_value}>{clampedScore}%</p>
              )}
              {showLabel && (
                <div className={styles.HealthScoreGauge_badge}>{label}</div>
              )}
            </div>
          )}
          {insight && (
            <p className={styles.HealthScoreGauge_insight}>{insight}</p>
          )}
        </div>
      </div>
      {action && (
        <Link to={action.to} className={styles.HealthScoreGauge_action}>
          {action.label}
          <ArrowCircleRightIcon size={20} />
        </Link>
      )}
    </div>
  );
}

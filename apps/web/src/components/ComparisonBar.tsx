import { CaretDownIcon } from "@phosphor-icons/react";

import styles from "./ComparisonBar.module.css";

/**
 * The four quartiles the track is painted in, left to right — less energy
 * (better) on the left, more energy (worse) on the right.
 */
export type ComparisonZone = "primary" | "secondary" | "warning" | "danger";

const ZONES: ComparisonZone[] = ["primary", "secondary", "warning", "danger"];

function getZone(position: number): ComparisonZone {
  if (position < 25) return "primary";
  if (position < 50) return "secondary";
  if (position < 75) return "warning";
  return "danger";
}

const ZONE_LABELS: Record<ComparisonZone, string> = {
  primary: "Excellent",
  secondary: "Good",
  warning: "Fair",
  danger: "Poor",
};

export interface ComparisonBarProps {
  value: number;
  average: number;
  valueLabel?: string;
  /**
   * How far the scale extends past the average before clamping, as a
   * fraction of the average. 1 means the track spans [0, 2x average].
   */
  scaleRange?: number;
}

export const ComparisonBar = ({
  value,
  average,
  valueLabel = "You",
  scaleRange = 1,
}: ComparisonBarProps) => {
  const deltaPercent = average === 0 ? 0 : ((value - average) / average) * 100;

  const scaleMax = average + average * scaleRange;
  const rawPosition = scaleMax === 0 ? 50 : (value / scaleMax) * 100;
  const position = Math.min(100, Math.max(0, rawPosition));
  const zone = getZone(position);

  const deltaLabel =
    Math.round(deltaPercent) === 0
      ? "About average"
      : `${Math.round(Math.abs(deltaPercent))}% ${value < average ? "less" : "more"} energy`;

  // Keep the floating label from being clipped by the card edges when the
  // indicator itself sits near 0% or 100%.
  const labelPosition = Math.min(88, Math.max(12, position));

  return (
    <div className={styles.ComparisonBar}>
      <div className={styles.ComparisonBar_track}>
        <div className={styles.ComparisonBar_averageTick} />

        <div
          className={styles.ComparisonBar_indicator}
          style={{ left: `${labelPosition}%` }}
          data-zone={zone}
        >
          <p className={styles.ComparisonBar_labelName}>{valueLabel}</p>
          <p className={styles.ComparisonBar_labelDelta}>{deltaLabel}</p>
          <CaretDownIcon
            weight="fill"
            size={16}
            className={styles.ComparisonBar_indicatorIcon}
          />
        </div>
      </div>
      <div className={styles.ComparisonBar_endLabels}>
        <span>Less energy</span>
        <span>More energy</span>
      </div>

      <div className={styles.ComparisonBar_legend}>
        {ZONES.slice(0, 2).map((zoneName) => (
          <span key={zoneName} className={styles.ComparisonBar_legendItem}>
            <i
              className={styles.ComparisonBar_legendSwatch}
              data-zone={zoneName}
            />
            {ZONE_LABELS[zoneName]}
          </span>
        ))}
        <span className={styles.ComparisonBar_legendItem}>
          <i
            className={`${styles.ComparisonBar_legendSwatch} ${styles.ComparisonBar_legendSwatch__average}`}
          />
          Average
        </span>
        {ZONES.slice(2).map((zoneName) => (
          <span key={zoneName} className={styles.ComparisonBar_legendItem}>
            <i
              className={styles.ComparisonBar_legendSwatch}
              data-zone={zoneName}
            />
            {ZONE_LABELS[zoneName]}
          </span>
        ))}
      </div>
    </div>
  );
};

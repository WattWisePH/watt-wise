import { TrendDownIcon, TrendUpIcon } from "@phosphor-icons/react";

import styles from "../Insights.module.css";
import type { ConsumptionRow } from "../types";

export interface ConsumptionComparisonProps {
  rows: ConsumptionRow[];
  unit?: string;
}

export const ConsumptionComparison = ({
  rows,
  unit = "kWh",
}: ConsumptionComparisonProps) => {
  const average = rows.find((row) => row.isAverage)?.value;
  const maxValue = Math.max(...rows.map((row) => row.value));

  return (
    <div className={styles.AverageConsumption_list}>
      {rows.map((row) => {
        const deltaPercent =
          !row.isAverage && average
            ? Math.round(((row.value - average) / average) * 100)
            : null;
        const trend =
          deltaPercent === null ? undefined : deltaPercent > 0 ? "up" : "down";

        return (
          <div key={row.label} className={styles.AverageConsumption_row}>
            <div className={styles.AverageConsumption_rowHeader}>
              <span className={styles.AverageConsumption_rowLabel}>
                {row.label}
              </span>
              <span className={styles.AverageConsumption_rowMeta}>
                {deltaPercent !== null && deltaPercent !== 0 && (
                  <span
                    className={styles.AverageConsumption_delta}
                    data-trend={trend}
                  >
                    {trend === "up" ? (
                      <TrendUpIcon size={12} weight="bold" />
                    ) : (
                      <TrendDownIcon size={12} weight="bold" />
                    )}
                    {Math.abs(deltaPercent)}%
                  </span>
                )}
                <span className={styles.AverageConsumption_number}>
                  {row.value} {unit}
                </span>
              </span>
            </div>
            <div className={styles.AverageConsumption_barTrack}>
              <div
                className={styles.AverageConsumption_barFill}
                data-trend={row.isAverage ? undefined : trend}
                style={{
                  width: `${(row.value / maxValue) * 100}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

import {
  ReceiptIcon,
  TrendUpIcon,
  TrendDownIcon,
  LightningIcon,
  CoinsIcon,
} from "@phosphor-icons/react";

import styles from "./DashboardStats.module.css";
import dashboardStyles from "../Dashboard.module.css";
import duotone from "../../../styles/DuotoneIcon.module.css";

export interface DashboardStatsProps {
  currentMonthAmount: number;
  currentMonthUnit: string;
  vsLastMonthPercent: number;
  totalConsumption: number;
  totalConsumptionUnit: string;
  costPerUnit: number;
  costPerUnitLabel: string;
}

export function DashboardStats({
  currentMonthAmount,
  currentMonthUnit,
  vsLastMonthPercent,
  totalConsumption,
  totalConsumptionUnit,
  costPerUnit,
  costPerUnitLabel,
}: DashboardStatsProps) {
  const isIncrease = vsLastMonthPercent >= 0;
  const TrendIcon = isIncrease ? TrendUpIcon : TrendDownIcon;

  return (
    <div className={dashboardStyles.Stats}>
      <div
        className={`${dashboardStyles.Dashboard_card} ${dashboardStyles.Stats_card}`}
      >
        <div className={styles.Stats_header}>
          <ReceiptIcon size={20} className={duotone.navy} />
          <p
            className={`${dashboardStyles.Stats_label} ${dashboardStyles.Text_muted}`}
          >
            This Month
          </p>
        </div>
        <div>
          <span className={dashboardStyles.Stats_value}>
            {currentMonthAmount.toLocaleString()}
          </span>
          <span
            className={`${dashboardStyles.Stats_label} ${dashboardStyles.Text_muted}`}
          >
            {currentMonthUnit}
          </span>
        </div>
      </div>

      <div
        className={`${dashboardStyles.Dashboard_card} ${dashboardStyles.Stats_card} ${
          isIncrease ? styles.Stats_card__increase : styles.Stats_card__decrease
        }`}
      >
        <div className={styles.Stats_header}>
          <TrendIcon
            size={20}
            weight="bold"
            className={styles.Stats_trendIcon}
          />
          <p className={dashboardStyles.Stats_label}>vs Last Month</p>
        </div>
        <div>
          <span className={dashboardStyles.Stats_value}>
            {Math.abs(vsLastMonthPercent)}%
          </span>
          <span className={dashboardStyles.Stats_label}>
            {isIncrease ? "increase" : "decrease"}
          </span>
        </div>
      </div>

      <div
        className={`${dashboardStyles.Dashboard_card} ${dashboardStyles.Stats_card}`}
      >
        <div className={styles.Stats_header}>
          <LightningIcon size={20} className={duotone.amber} />
          <p
            className={`${dashboardStyles.Stats_label} ${dashboardStyles.Text_muted}`}
          >
            Total Consumption
          </p>
        </div>
        <div>
          <span className={dashboardStyles.Stats_value}>
            {totalConsumption.toLocaleString()}
          </span>
          <span
            className={`${dashboardStyles.Stats_label} ${dashboardStyles.Text_muted}`}
          >
            {totalConsumptionUnit}
          </span>
        </div>
      </div>

      <div
        className={`${dashboardStyles.Dashboard_card} ${dashboardStyles.Stats_card}`}
      >
        <div className={styles.Stats_header}>
          <CoinsIcon size={20} className={duotone.green} />
          <p
            className={`${dashboardStyles.Stats_label} ${dashboardStyles.Text_muted}`}
          >
            Cost per {costPerUnitLabel}
          </p>
        </div>
        <div>
          <span className={dashboardStyles.Stats_value}>{costPerUnit}</span>
          <span
            className={`${dashboardStyles.Stats_label} ${dashboardStyles.Text_muted}`}
          >
            pesos
          </span>
        </div>
      </div>
    </div>
  );
}

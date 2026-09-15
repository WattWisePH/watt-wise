import { ChartBarIcon, GaugeIcon } from "@phosphor-icons/react";

import styles from "../Insights.module.css";
import duotone from "../../../styles/DuotoneIcon.module.css";
import { HealthScoreGauge } from "../../../components/HealthScoreGauge";
import { ComparisonBar } from "../../../components/ComparisonBar";
import { ConsumptionComparison } from "./ConsumptionComparison";
import type { ConsumptionRow } from "../types";

const consumptionRows: ConsumptionRow[] = [
  { label: "Average Cafe", value: 265, isAverage: true },
  { label: "Cafe Marie", value: 312 },
];

export const HealthScore = () => {
  return (
    <div className={styles.Insights}>
      {/* Energy Health Score */}
      <section className={styles.Insights_section}>
        <div>
          <h1 className={styles.Insights_sectionTitle}>Energy Health Score</h1>
          <p className={`${styles.Insights_sectionSubtitle}`}>
            Calculated based on your bills and appliances.
          </p>
        </div>
        <HealthScoreGauge
          score={78}
          label="Good"
          showTitle={false}
          insight="Better than 65% of similar cafes"
        />
      </section>

      {/* Benchmark */}
      <section className={styles.Insights_section}>
        <div>
          <h1 className={styles.Insights_sectionTitle}>Benchmark</h1>
          <p className={`${styles.Insights_sectionSubtitle}`}>
            See how you compare to other users.
          </p>
        </div>
        <div className={styles.Insights_card}>
          <p className={styles.Benchmark_description}>
            You consume{" "}
            <span className={styles.Benchmark_description__colored}>18%</span>{" "}
            more electricity than similar{" "}
            <span className={styles.Benchmark_description__colored}>cafes</span>{" "}
            .
          </p>
        </div>
        <div className={styles.Insights_card}>
          <div className={styles.Insights_cardTitle}>
            <GaugeIcon
              size={20}
              className={`${duotone.navy} ${styles.Insights_cardIcon}`}
            />
            Comparison Bar
          </div>
          <ComparisonBar value={312} average={265} valueLabel="Cafe Marie" />
        </div>
        <div className={styles.Insights_card}>
          <div className={styles.Insights_cardTitle}>
            <ChartBarIcon
              size={20}
              className={`${duotone.amber} ${styles.Insights_cardIcon}`}
            />
            Average KWH Consumption this Month
          </div>
          <ConsumptionComparison rows={consumptionRows} />
        </div>
      </section>
    </div>
  );
};

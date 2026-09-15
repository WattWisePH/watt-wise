import { GaugeIcon, LightningIcon, ScalesIcon } from "@phosphor-icons/react";

import styles from "../Insights.module.css";
import duotone from "../../../styles/DuotoneIcon.module.css";
import { HealthScoreGauge } from "../../../components/HealthScoreGauge";

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
          <h1 className={styles.Insights_sectionTitle}>
            Benchmark
            <GaugeIcon
              size={20}
              className={`${duotone.navy} ${styles.Insights_titleIcon}`}
            />
          </h1>
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
            <ScalesIcon
              size={20}
              className={`${duotone.navy} ${styles.Insights_cardIcon}`}
            />
            Comparison Bar
          </div>
          <div className={styles.Comparison_placeholder}>placeholder</div>
        </div>
        <div className={styles.Insights_card}>
          <div className={styles.Insights_cardTitle}>
            <LightningIcon
              size={20}
              className={`${duotone.amber} ${styles.Insights_cardIcon}`}
            />
            Average KWH Consumption this Month
          </div>
          <table className={styles.AverageConsumption_table}>
            <thead>
              <tr>
                <th>Building</th>
                <th>Monthly Consumption</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Cafes</td>
                <td className={styles.AverageConsumption_number}>265 kWh</td>
              </tr>
              <tr>
                <td>Cafe Marie</td>
                <td className={styles.AverageConsumption_number}>312 kWh</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

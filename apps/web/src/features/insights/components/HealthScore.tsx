import styles from "../Insights.module.css";
import { HealthScoreGauge } from "../../../components/HealthScoreGauge";
import { useInsightsData } from "../useInsights";
import { scoreInsight } from "../../../lib/insights";

export const HealthScore = () => {
  const { result, benchmark, narrative } = useInsightsData();

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
          score={result.healthScore}
          label={result.healthLabel}
          showTitle={false}
          insight={scoreInsight(result, benchmark)}
        />
        {/* Written by a model after the score, so it arrives a moment
            later. Absent entirely when it couldn't be written — the
            analysis above is complete without it. */}
        {narrative.status === "pending" && (
          <p className={styles.Insights_sectionSubtitle}>Writing a summary…</p>
        )}
        {narrative.status === "ready" && (
          <div className={styles.Insights_card}>
            <p className={styles.Benchmark_description}>{narrative.summary}</p>
          </div>
        )}
      </section>

    </div>
  );
};

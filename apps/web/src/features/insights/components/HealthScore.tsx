import { ChartBarIcon, GaugeIcon } from "@phosphor-icons/react";

import styles from "../Insights.module.css";
import duotone from "../../../styles/DuotoneIcon.module.css";
import { HealthScoreGauge } from "../../../components/HealthScoreGauge";
import { ComparisonBar } from "../../../components/ComparisonBar";
import { ConsumptionComparison } from "./ConsumptionComparison";
import { useInsightsData } from "../useInsights";
import {
  gapPhrase,
  scoreInsight,
  type BenchmarkContext,
} from "../../../lib/insights";
import type { ConsumptionRow } from "../types";

/**
 * What to call the figure being compared against.
 *
 * A cohort that was too small to disclose falls back to a published
 * reference average, and saying "similar establishments" over that number
 * would claim a comparison that never happened.
 */
function peerLabel(benchmark: BenchmarkContext): string {
  return benchmark.source === "peers"
    ? `Average of ${benchmark.cohortSize} similar`
    : "Reference average";
}

export const HealthScore = () => {
  const { result, benchmark, basedOn, narrative } = useInsightsData();
  const { peerAverageKwh, deltaPct } = result.benchmark;

  const consumptionRows: ConsumptionRow[] = [
    { label: peerLabel(benchmark), value: peerAverageKwh, isAverage: true },
    { label: result.accountName, value: basedOn.kwhUsed },
  ];

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

      {/* Benchmark */}
      <section className={styles.Insights_section}>
        <div>
          <h1 className={styles.Insights_sectionTitle}>Benchmark</h1>
          <p className={`${styles.Insights_sectionSubtitle}`}>
            {benchmark.source === "peers"
              ? "See how you compare to other users."
              : "A real comparison needs more establishments like yours."}
          </p>
        </div>
        <div className={styles.Insights_card}>
          <p className={styles.Benchmark_description}>
            You consume{" "}
            <span className={styles.Benchmark_description__colored}>
              {gapPhrase(deltaPct)}
            </span>{" "}
            {benchmark.source === "peers"
              ? "the average of similar establishments."
              : "a published reference average."}
          </p>
        </div>
        <div className={styles.Insights_card}>
          <div className={styles.Insights_cardTitle}>
            <GaugeIcon
              size={20}
              className={`${duotone.neutral} ${styles.Insights_cardIcon}`}
            />
            Comparison Bar
          </div>
          <ComparisonBar
            value={basedOn.kwhUsed}
            average={peerAverageKwh}
            valueLabel={result.accountName}
          />
        </div>
        <div className={styles.Insights_card}>
          <div className={styles.Insights_cardTitle}>
            <ChartBarIcon
              size={20}
              className={`${duotone.neutral} ${styles.Insights_cardIcon}`}
            />
            Monthly Consumption
          </div>
          <ConsumptionComparison rows={consumptionRows} />
        </div>
      </section>
    </div>
  );
};

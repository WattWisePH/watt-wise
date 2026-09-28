import { CheckIcon, XIcon } from "@phosphor-icons/react";

import styles from "../Insights.module.css";
import duotone from "../../../styles/DuotoneIcon.module.css";
import { useInsightsData } from "../useInsights";
import type { ImpactLevel } from "../../../lib/insights";

/** "high" -> "High Impact", as the badge reads it. */
function impactLabel(impact: ImpactLevel): string {
  return `${impact.charAt(0).toUpperCase()}${impact.slice(1)} Impact`;
}

export const PriorityActions = () => {
  const { result } = useInsightsData();
  const { recommendations } = result;

  // Every rule passing is a good outcome, not an empty screen — say so,
  // rather than leaving the section blank and looking unfinished.
  if (recommendations.length === 0) {
    return (
      <div className={styles.Insights}>
        <section className={styles.Insights_section}>
          <div>
            <h1 className={styles.Insights_sectionTitle}>Priority Actions</h1>
          </div>
          <div className={styles.Insights_card}>
            <p className={styles.Insights_sectionSubtitle}>
              Nothing needs attention right now — your usage looks healthy.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.Insights}>
      <section className={styles.Insights_section}>
        <div>
          <h1 className={styles.Insights_sectionTitle}>Priority Actions</h1>
          <p className={`${styles.Insights_sectionSubtitle}`}>
            Possible steps to take to improve energy efficiency.
          </p>
        </div>

        <div className={styles.PriorityAction_actionList}>
          {/* Already ordered most-impactful first by the engine. */}
          {recommendations.map((recommendation) => {
            return (
              <div className={`${styles.Insights_card}`} key={recommendation.id}>
                <div className={styles.PriorityAction_heading}>
                  <h3 className={styles.Insights_cardTitle}>
                    {recommendation.title}
                  </h3>
                  <div
                    className={`${styles.PriorityAction_badge} ${recommendation.impact === "medium" ? styles.PriorityAction_badge__medium : ""}`}
                  >
                    {impactLabel(recommendation.impact)}
                  </div>
                </div>
                <p className={styles.PriorityAction_description}>
                  {recommendation.description}
                </p>
                <div className={styles.PriorityAction_buttonContainer}>
                  <button
                    className={`${styles.PriorityAction_button} ${styles.PriorityAction_button__action}`}
                  >
                    <CheckIcon className={styles.PriorityAction_icon} />
                    Action Taken
                  </button>
                  <button
                    className={`${styles.PriorityAction_button} ${styles.PriorityAction_button__dismiss}`}
                  >
                    <XIcon
                      className={`${styles.PriorityAction_icon} ${duotone.neutral}`}
                    />
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

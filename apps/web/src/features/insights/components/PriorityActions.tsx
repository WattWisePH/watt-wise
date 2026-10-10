import { CheckIcon, XIcon } from "@phosphor-icons/react";

import styles from "../Insights.module.css";
import duotone from "../../../styles/DuotoneIcon.module.css";
import { useInsightsData } from "../useInsights";
import type { ImpactLevel } from "../../../lib/insights";

/** "high" -> "High Impact", as the badge reads it. */
function impactLabel(impact: ImpactLevel): string {
  return `${impact.charAt(0).toUpperCase()}${impact.slice(1)} Impact`;
}

interface ActionCardProps {
  title: string;
  description: string;
  impact: ImpactLevel;
}

/** One action card. Shared so a rule's finding and a model's suggestion
 *  read the same way — what separates them is the heading they sit under,
 *  not a difference in styling that nobody would notice. */
function ActionCard({ title, description, impact }: ActionCardProps) {
  return (
    <div className={styles.Insights_card}>
      <div className={styles.PriorityAction_heading}>
        <h3 className={styles.Insights_cardTitle}>{title}</h3>
        <div
          className={`${styles.PriorityAction_badge} ${impact === "medium" ? styles.PriorityAction_badge__medium : ""}`}
        >
          {impactLabel(impact)}
        </div>
      </div>
      <p className={styles.PriorityAction_description}>{description}</p>
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
          <XIcon className={`${styles.PriorityAction_icon} ${duotone.neutral}`} />
          Dismiss
        </button>
      </div>
    </div>
  );
}

export const PriorityActions = () => {
  const { result, narrative } = useInsightsData();
  const { recommendations } = result;
  const suggestions = narrative.status === "ready" ? narrative.actions : [];

  // Every rule passing with nothing suggested either is a good outcome, not
  // an empty screen — say so, rather than leaving the section blank and
  // looking unfinished.
  if (recommendations.length === 0 && suggestions.length === 0) {
    return (
      <div className={styles.Insights}>
        <section className={styles.Insights_section}>
          <div>
            <h1 className={styles.Insights_sectionTitle}>Priority Actions</h1>
          </div>
          <div className={styles.Insights_card}>
            <p className={styles.Insights_sectionSubtitle}>
              {narrative.status === "pending"
                ? "Nothing needs attention from your figures. Still looking for anything else worth suggesting…"
                : "Nothing needs attention right now — your usage looks healthy."}
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.Insights}>
      {recommendations.length > 0 && (
        <section className={styles.Insights_section}>
          <div>
            <h1 className={styles.Insights_sectionTitle}>Priority Actions</h1>
            <p className={`${styles.Insights_sectionSubtitle}`}>
              Possible steps to take to improve energy efficiency.
            </p>
          </div>

          <div className={styles.PriorityAction_actionList}>
            {/* Already ordered most-impactful first by the engine. */}
            {recommendations.map((recommendation) => (
              <ActionCard
                key={recommendation.id}
                title={recommendation.title}
                description={recommendation.description}
                impact={recommendation.impact}
              />
            ))}
          </div>
        </section>
      )}

      {/* Below the rule-based list, under a heading that says where these
          came from. The ones above are each traceable to a figure on the
          bill; these are a model's judgement about those figures, and a
          reader deciding what to spend money on is entitled to know which
          is which. */}
      {suggestions.length > 0 && (
        <section className={styles.Insights_section}>
          <div>
            <h1 className={styles.Insights_sectionTitle}>Also worth considering</h1>
            <p className={`${styles.Insights_sectionSubtitle}`}>
              Suggested by AI from the same figures. Check these against your own
              setup before acting on them.
            </p>
          </div>

          <div className={styles.PriorityAction_actionList}>
            {suggestions.map((suggestion, index) => (
              <ActionCard
                // The model gives these no id, and the list is replaced
                // wholesale on every rewrite, so position is stable enough.
                key={`${index}-${suggestion.title}`}
                title={suggestion.title}
                description={suggestion.description}
                impact={suggestion.impact}
              />
            ))}
          </div>
        </section>
      )}

      {narrative.status === "pending" && (
        <p className={styles.Insights_sectionSubtitle}>
          Looking for anything else worth suggesting…
        </p>
      )}
    </div>
  );
};

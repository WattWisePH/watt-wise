import { useEffect, useState } from "react";
import { CheckIcon, XIcon } from "@phosphor-icons/react";

import styles from "../Insights.module.css";
import duotone from "../../../styles/DuotoneIcon.module.css";
import { Toast } from "../../../components/Toast";
import { useInsightsData } from "../useInsights";
import type { ImpactLevel, Savings } from "../../../lib/insights";

/** How long the "action taken" confirmation stays up. */
const TOAST_MS = 3000;

/** "high" -> "High Impact", as the badge reads it. */
function impactLabel(impact: ImpactLevel): string {
  return `${impact.charAt(0).toUpperCase()}${impact.slice(1)} Impact`;
}

interface ActionCardProps {
  title: string;
  description: string;
  impact: ImpactLevel;
  savings?: Savings;
  /** Playing its exit animation; removed once it ends. */
  leaving: boolean;
  onAction: () => void;
  onDismiss: () => void;
  onLeft: () => void;
}

/** One action card. Shared so a rule's finding and a model's suggestion
 *  read the same way — what separates them is the heading they sit under,
 *  not a difference in styling that nobody would notice. */
function ActionCard({
  title,
  description,
  impact,
  savings,
  leaving,
  onAction,
  onDismiss,
  onLeft,
}: ActionCardProps) {
  return (
    <div
      className={`${styles.Insights_card} ${leaving ? styles.PriorityAction_card__leaving : ""}`}
      onAnimationEnd={leaving ? onLeft : undefined}
    >
      <div className={styles.PriorityAction_heading}>
        <h3 className={styles.Insights_cardTitle}>{title}</h3>
        <div
          className={`${styles.PriorityAction_badge} ${impact === "medium" ? styles.PriorityAction_badge__medium : ""}`}
        >
          {impactLabel(impact)}
        </div>
      </div>
      <p className={styles.PriorityAction_description}>{description}</p>
      {savings && savings.kwh > 0 && (
        <p className={styles.PriorityAction_savings}>
          Est. savings: ₱{savings.php.toLocaleString()} ({savings.kwh} kWh) / month
        </p>
      )}
      <div className={styles.PriorityAction_buttonContainer}>
        <button
          className={`${styles.PriorityAction_button} ${styles.PriorityAction_button__action}`}
          onClick={onAction}
          disabled={leaving}
        >
          <CheckIcon className={styles.PriorityAction_icon} />
          Action Taken
        </button>
        <button
          className={`${styles.PriorityAction_button} ${styles.PriorityAction_button__dismiss}`}
          onClick={onDismiss}
          disabled={leaving}
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
  // Frontend only for now: taken and dismissed cards come back on reload.
  const [gone, setGone] = useState<string[]>([]);
  const [leaving, setLeaving] = useState<string[]>([]);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const ruleSavings = narrative.status === "ready" ? narrative.ruleSavings : {};
  const recommendations = result.recommendations.filter((r) => !gone.includes(r.id));
  const suggestions = (narrative.status === "ready" ? narrative.actions : [])
    // The model gives these no id, and the list is replaced wholesale on
    // every rewrite, so position is stable enough.
    .map((suggestion, index) => ({ ...suggestion, key: `ai-${index}` }))
    .filter((s) => !gone.includes(s.key));

  /** Props wiring a card's buttons to its exit, keyed by its id. */
  const cardActions = (key: string, title: string) => ({
    leaving: leaving.includes(key),
    onAction: () => {
      setLeaving((prev) => [...prev, key]);
      setToast({ id: Date.now(), text: `Nice work! "${title}" marked as done.` });
    },
    onDismiss: () => setLeaving((prev) => [...prev, key]),
    onLeft: () => {
      setGone((prev) => [...prev, key]);
      setLeaving((prev) => prev.filter((k) => k !== key));
    },
  });

  const toastEl = toast && <Toast key={toast.id} message={toast.text} />;

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
                : gone.length > 0
                  ? "All caught up — nothing else needs attention right now."
                  : "Nothing needs attention right now — your usage looks healthy."}
            </p>
          </div>
        </section>
        {toastEl}
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
                savings={ruleSavings[recommendation.id]}
                {...cardActions(recommendation.id, recommendation.title)}
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
            {suggestions.map((suggestion) => (
              <ActionCard
                key={suggestion.key}
                title={suggestion.title}
                description={suggestion.description}
                impact={suggestion.impact}
                savings={suggestion.savings}
                {...cardActions(suggestion.key, suggestion.title)}
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
      {toastEl}
    </div>
  );
};

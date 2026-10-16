import { useEffect, useState } from "react";
import { ArchiveIcon, CheckIcon, XIcon } from "@phosphor-icons/react";
import { Link } from "react-router";

import styles from "../Insights.module.css";
import duotone from "../../../styles/DuotoneIcon.module.css";
import { Toast } from "../../../components/Toast";
import { useInsightsData } from "../useInsights";
import { useEstablishment } from "../../establishment/hooks/useEstablishment";
import { ApiError } from "../../../lib/api";
import {
  archivedIds,
  setActionStatus,
  type ActionStatus,
  type ImpactLevel,
  type Savings,
} from "../../../lib/insights";

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
          Est. savings: ₱{savings.php.toLocaleString()} ({savings.kwh} kWh) /
          month
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
          <XIcon
            className={`${styles.PriorityAction_icon} ${duotone.neutral}`}
          />
          Dismiss
        </button>
      </div>
    </div>
  );
}

export const PriorityActions = () => {
  const { result, narrative, basedOn, archived, setArchived } =
    useInsightsData();
  const { activeEstablishmentId } = useEstablishment();
  // Cards whose exit animation has finished but whose save hasn't come back
  // yet. Kept hidden meanwhile; put back if the save fails.
  const [gone, setGone] = useState<string[]>([]);
  const [leaving, setLeaving] = useState<string[]>([]);
  const [toast, setToast] = useState<{
    id: number;
    text: string;
    error?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // A new id per message, so the toast's entrance replays.
  const showToast = (text: string, error = false) =>
    setToast((prev) => ({ id: (prev?.id ?? 0) + 1, text, error }));

  const hidden = archivedIds(archived, basedOn.billId);
  const isShown = (id: string) => !hidden.has(id) && !gone.includes(id);
  const ruleSavings = narrative.status === "ready" ? narrative.ruleSavings : {};
  const recommendations = result.recommendations.filter((r) => isShown(r.id));
  const suggestions = (
    narrative.status === "ready" ? narrative.actions : []
  ).filter((s) => isShown(s.id));

  /** Save a card's status, archiving it on success and restoring it on failure. */
  const archive = async (
    status: ActionStatus,
    card: {
      id: string;
      title: string;
      description: string;
      impact: ImpactLevel;
      savings?: Savings;
    },
  ) => {
    setLeaving((prev) => [...prev, card.id]);
    const action = {
      billId: basedOn.billId,
      actionId: card.id,
      status,
      title: card.title,
      description: card.description,
      impact: card.impact,
      savings: card.savings ?? null,
    };
    try {
      await setActionStatus(activeEstablishmentId!, action);
      setArchived((prev) => [
        {
          ...action,
          periodStart: basedOn.periodStart,
          periodEnd: basedOn.periodEnd,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      if (status === "done") {
        showToast(`Nice work! "${card.title}" marked as done.`);
      }
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? err.message
          : "Couldn't save that. Try again.",
        true,
      );
    } finally {
      setLeaving((prev) => prev.filter((k) => k !== card.id));
      setGone((prev) => prev.filter((k) => k !== card.id));
    }
  };

  /** Props wiring a card's buttons to its exit. */
  const cardActions = (card: Parameters<typeof archive>[1]) => ({
    leaving: leaving.includes(card.id),
    onAction: () => void archive("done", card),
    onDismiss: () => void archive("dismissed", card),
    onLeft: () => setGone((prev) => [...prev, card.id]),
  });

  const toastEl = toast && (
    <Toast key={toast.id} message={toast.text} error={toast.error} />
  );

  // On whichever section heading comes first, so it is always on screen.
  const archiveLink = (
    <Link to="../archived" className={styles.Insights_headerLink}>
      <ArchiveIcon size={16} />
      Archived
    </Link>
  );

  // Every rule passing with nothing suggested either is a good outcome, not
  // an empty screen — say so, rather than leaving the section blank and
  // looking unfinished.
  if (recommendations.length === 0 && suggestions.length === 0) {
    return (
      <div className={styles.Insights}>
        <section className={styles.Insights_section}>
          <div className={styles.Insights_titleRow}>
            <h1 className={styles.Insights_sectionTitle}>Priority Actions</h1>
            {archiveLink}
          </div>
          <div className={styles.Insights_card}>
            <p className={styles.Insights_sectionSubtitle}>
              {narrative.status === "pending"
                ? "Nothing needs attention from your figures. Still looking for anything else worth suggesting…"
                : hidden.size > 0
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
          <div className={styles.Insights_titleRow}>
            <div>
              <h1 className={styles.Insights_sectionTitle}>Priority Actions</h1>
              <p className={`${styles.Insights_sectionSubtitle}`}>
                Possible steps to take to improve energy efficiency.
              </p>
            </div>
            {archiveLink}
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
                {...cardActions({
                  ...recommendation,
                  savings: ruleSavings[recommendation.id],
                })}
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
            <div className={styles.Insights_titleRow}>
              <h1 className={styles.Insights_sectionTitle}>
                Also worth considering
              </h1>
              {recommendations.length === 0 && archiveLink}
            </div>
            <p className={`${styles.Insights_sectionSubtitle}`}>
              Suggested by AI from the same figures. Check these against your
              own setup before acting on them.
            </p>
          </div>

          <div className={styles.PriorityAction_actionList}>
            {suggestions.map((suggestion) => (
              <ActionCard
                key={suggestion.id}
                title={suggestion.title}
                description={suggestion.description}
                impact={suggestion.impact}
                savings={suggestion.savings}
                {...cardActions(suggestion)}
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

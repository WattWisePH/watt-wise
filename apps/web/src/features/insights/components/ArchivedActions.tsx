import { useEffect, useState } from "react";
import { ArrowCounterClockwiseIcon, ArrowLeftIcon } from "@phosphor-icons/react";
import { Link } from "react-router";

import styles from "../Insights.module.css";
import { Toast } from "../../../components/Toast";
import { useInsightsData } from "../useInsights";
import { useEstablishment } from "../../establishment/hooks/useEstablishment";
import { ApiError } from "../../../lib/api";
import { clearActionStatus, type ArchivedAction } from "../../../lib/insights";

/** "June 2026", from the bill's period. Read as UTC: it is a bare date. */
function billLabel(action: ArchivedAction): string {
  const date = action.periodEnd ?? action.periodStart;
  if (!date) return "Undated bill";
  return `${new Date(date).toLocaleString("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })} bill`;
}

/**
 * Priority actions the user has marked done or dismissed, grouped by the
 * bill they were acted on, each with a way back into Priority Actions.
 */
export const ArchivedActions = () => {
  const { archived, setArchived } = useInsightsData();
  const { activeEstablishmentId } = useEstablishment();
  const [restoring, setRestoring] = useState<string[]>([]);
  const [error, setError] = useState<{ id: number; text: string } | null>(null);

  // Same lifetime as Priority Actions' toast.
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(timer);
  }, [error]);

  const keyOf = (a: ArchivedAction) => `${a.billId}/${a.actionId}`;

  const restore = async (action: ArchivedAction) => {
    const key = keyOf(action);
    setRestoring((prev) => [...prev, key]);
    try {
      await clearActionStatus(activeEstablishmentId!, action.billId, action.actionId);
      setArchived((prev) => prev.filter((a) => keyOf(a) !== key));
    } catch (err) {
      const text = err instanceof ApiError ? err.message : "Couldn't restore that. Try again.";
      // A new id per message, so the toast's entrance replays.
      setError((prev) => ({ id: (prev?.id ?? 0) + 1, text }));
    } finally {
      setRestoring((prev) => prev.filter((k) => k !== key));
    }
  };

  // Newest first already, so groups come out newest bill first.
  const groups = new Map<string, ArchivedAction[]>();
  for (const action of archived) {
    const label = billLabel(action);
    groups.set(label, [...(groups.get(label) ?? []), action]);
  }

  return (
    <div className={styles.Insights}>
      <section className={styles.Insights_section}>
        <div>
          <div className={styles.Insights_titleRow}>
            <h1 className={styles.Insights_sectionTitle}>Archived Actions</h1>
            <Link to="../priority-actions" className={styles.Insights_headerLink}>
              <ArrowLeftIcon size={16} />
              Back
            </Link>
          </div>
          <p className={styles.Insights_sectionSubtitle}>
            Actions you've marked done or dismissed. Restore one to put it back in
            Priority Actions.
          </p>
        </div>
        {archived.length === 0 && (
          <div className={styles.Insights_card}>
            <p className={styles.Insights_sectionSubtitle}>
              Nothing here yet. Actions you mark done or dismiss will show up here.
            </p>
          </div>
        )}
      </section>

      {[...groups].map(([label, actions]) => (
        <section key={label} className={styles.Insights_section}>
          <h2 className={styles.Archived_groupTitle}>{label}</h2>
          <div className={styles.PriorityAction_actionList}>
            {actions.map((action) => (
              <div key={keyOf(action)} className={styles.Insights_card}>
                <div className={styles.PriorityAction_heading}>
                  <h3 className={styles.Insights_cardTitle}>{action.title}</h3>
                  <div
                    className={`${styles.PriorityAction_badge} ${
                      action.status === "done"
                        ? styles.Archived_badge__done
                        : styles.Archived_badge__dismissed
                    }`}
                  >
                    {action.status === "done" ? "Done" : "Dismissed"}
                  </div>
                </div>
                <p className={styles.PriorityAction_description}>{action.description}</p>
                {action.savings && action.savings.kwh > 0 && (
                  <p className={styles.PriorityAction_savings}>
                    Est. savings: ₱{action.savings.php.toLocaleString()} (
                    {action.savings.kwh} kWh) / month
                  </p>
                )}
                <div className={styles.PriorityAction_buttonContainer}>
                  <button
                    className={`${styles.PriorityAction_button} ${styles.PriorityAction_button__dismiss}`}
                    onClick={() => void restore(action)}
                    disabled={restoring.includes(keyOf(action))}
                  >
                    <ArrowCounterClockwiseIcon className={styles.PriorityAction_icon} />
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      {error && <Toast key={error.id} message={error.text} error />}
    </div>
  );
};

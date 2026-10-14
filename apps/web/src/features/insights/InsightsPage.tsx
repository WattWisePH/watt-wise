import { useState } from "react";
import { Outlet } from "react-router";

import styles from "./Insights.module.css";
import { InsightsTabs } from "./components/InsightsTabs";
import { HealthScoreGauge } from "../../components/HealthScoreGauge";
import { NEXT_STEP, message, useInsights, type InsightsContext } from "./useInsights";
import type { ArchivedAction } from "../../lib/insights";

export const InsightsPage = () => {
  // Loaded once here and passed to the tab screens through the outlet, so
  // switching tabs doesn't re-run the whole analysis.
  const state = useInsights();
  // Local edits to the archived list, remembered against the list they were
  // made on. A refetch brings a new list, which already includes them, so
  // the edits are dropped rather than applied twice.
  const [edited, setEdited] = useState<{
    base: ArchivedAction[];
    value: ArchivedAction[];
  } | null>(null);

  if (state.status !== "ready") {
    return (
      <div>
        <div className={styles.Insights}>
          <section className={styles.Insights_section}>
            <HealthScoreGauge
              showTitle={false}
              insight={message(state)}
              action={NEXT_STEP[state.status]}
            />
          </section>
        </div>
      </div>
    );
  }

  const base = state.insights.archived;
  const context: InsightsContext = {
    ...state.insights,
    archived: edited?.base === base ? edited.value : base,
    setArchived: (update) =>
      setEdited((prev) => ({
        base,
        value: update(prev?.base === base ? prev.value : base),
      })),
  };

  return (
    <div>
      <InsightsTabs />
      <Outlet context={context} />
    </div>
  );
};

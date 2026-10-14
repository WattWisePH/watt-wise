import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";

import styles from "./Insights.module.css";
import { Tabs, type Tab } from "../../components/Tabs";
import { HealthScoreGauge } from "../../components/HealthScoreGauge";
import { NEXT_STEP, message, useInsights, type InsightsContext } from "./useInsights";
import type { ArchivedAction } from "../../lib/insights";

/** A tab that is a child route, by its path segment. */
export interface RouteTab extends Tab {
  /** Sub-pages reached from this tab, which keep it lit. */
  also?: string[];
}

/**
 * A tabbed page over one establishment's analysis: fetches it once for every
 * tab, shows why there's nothing yet when there isn't, and keeps archived
 * actions in step across tabs. InsightsPage and ActionsPage are this with
 * their own tabs.
 */
export const AnalysisLayout = ({ tabs }: { tabs: RouteTab[] }) => {
  // Loaded once here and passed to the tab screens through the outlet, so
  // switching tabs doesn't re-run the whole analysis.
  const state = useInsights();
  const navigate = useNavigate();
  // The child route's segment: /actions/archived -> "archived".
  const segment = useLocation().pathname.split("/")[2];
  const selected = tabs.find((t) => t.id === segment || t.also?.includes(segment))?.id;
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
      <Tabs tabs={tabs} selected={selected} onSelect={(id) => navigate(id)} />
      <Outlet context={context} />
    </div>
  );
};

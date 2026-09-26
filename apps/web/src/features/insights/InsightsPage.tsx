import { Outlet } from "react-router";

import styles from "./Insights.module.css";
import { InsightsTabs } from "./components/InsightsTabs";
import { useInsights, type InsightsState } from "./useInsights";

/**
 * What to show when there is no analysis to show.
 *
 * Each state gets its own wording. They all look like "no data" on screen
 * otherwise, and the user's next step differs completely between them —
 * set up an establishment, upload a bill, or check the API is running.
 */
function message(state: Exclude<InsightsState, { status: "ready" }>): string {
  switch (state.status) {
    case "loading":
      return "Working out your energy health score…";
    case "no-establishment":
      return "Set up an establishment first — your insights are calculated per location.";
    case "empty":
      return "No bills yet. Upload one and your score will appear here.";
    case "error":
      return state.message;
  }
}

export const InsightsPage = () => {
  // Loaded once here and passed to the tab screens through the outlet, so
  // switching tabs doesn't re-run the whole analysis.
  const state = useInsights();

  return (
    <div>
      <InsightsTabs />
      {state.status === "ready" ? (
        <Outlet context={state.insights} />
      ) : (
        <div className={styles.Insights}>
          <section className={styles.Insights_section}>
            <div className={styles.Insights_card}>
              <p className={styles.Insights_sectionSubtitle}>{message(state)}</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

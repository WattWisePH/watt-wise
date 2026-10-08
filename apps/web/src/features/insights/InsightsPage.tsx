import { Link, Outlet } from "react-router";

import styles from "./Insights.module.css";
import { InsightsTabs } from "./components/InsightsTabs";
import { NEXT_STEP, message, useInsights } from "./useInsights";

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
              {NEXT_STEP[state.status] && (
                <Link to={NEXT_STEP[state.status]!.to}>
                  {NEXT_STEP[state.status]!.label}
                </Link>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

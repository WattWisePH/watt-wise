import { Outlet } from "react-router";

import styles from "./Insights.module.css";
import { InsightsTabs } from "./components/InsightsTabs";
import { HealthScoreGauge } from "../../components/HealthScoreGauge";
import { NEXT_STEP, message, useInsights } from "./useInsights";

export const InsightsPage = () => {
  // Loaded once here and passed to the tab screens through the outlet, so
  // switching tabs doesn't re-run the whole analysis.
  const state = useInsights();

  return (
    <div>
      {/* Tabs only while there's something to switch between. */}
      {state.status === "ready" ? (
        <>
          <InsightsTabs />
          <Outlet context={state.insights} />
        </>
      ) : (
        <div className={styles.Insights}>
          <section className={styles.Insights_section}>
            <HealthScoreGauge
              showTitle={false}
              insight={message(state)}
              action={NEXT_STEP[state.status]}
            />
          </section>
        </div>
      )}
    </div>
  );
};

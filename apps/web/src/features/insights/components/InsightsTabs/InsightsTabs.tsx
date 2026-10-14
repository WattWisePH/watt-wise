import { useLocation, useNavigate } from "react-router";
import styles from "./InsightsTabs.module.css";

export const InsightsTabs = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // The archive is reached from Priority Actions, so it keeps that tab lit.
  const segment = pathname.split("/")[2];
  const currentTab = segment === "archived" ? "priority-actions" : segment;

  return (
    <div className={styles.Tabs_background}>
      <ul className={styles.Tabs_container}>
        <li className={styles.Tabs_itemContainer}>
          <button
            className={`${styles.Tabs_button} ${currentTab === "health-score" ? styles.Tabs_button__selected : ""}`}
            onClick={() => navigate("health-score")}
          >
            <div className={`${styles.Tabs_label}`}>Health Score</div>
          </button>
        </li>
        <li className={styles.Tabs_itemContainer}>
          <button
            className={`${styles.Tabs_button} ${currentTab === "priority-actions" ? styles.Tabs_button__selected : ""}`}
            onClick={() => navigate("priority-actions")}
          >
            <div className={styles.Tabs_label}>Priority Actions</div>
          </button>
        </li>
      </ul>
    </div>
  );
};

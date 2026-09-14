import "material-symbols/rounded.css";

import styles from "./Dashboard.module.css";
import { useNavigate } from "react-router";

/**
 * Energy dashboard component. This is what the user first sees when logged in.
 * Displays health score, quick links, top priority actions, and some statistics.
 */
export function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className={styles.Dashboard}>
      <div className={styles.Dashboard_header}>
        <div className={styles.Selector}>
          <div className={styles.Selector_avatar} />
          <div className={styles.Selector_label}>Cafe Marie</div>
        </div>
        <span className="material-symbols-rounded">notifications</span>
      </div>
      <div className={`${styles.Dashboard_card} ${styles.Dashboard_card__green}`}>
        <div className={styles.Card_header}>
          <h3 className={styles.Card_title}>Energy Health Score</h3>
          <div className={styles.HealthCard_status}>Good</div>
        </div>
        <div className={styles.HealthCard_content}>
          <span
            className={`material-symbols-rounded ${styles.Icon__large} ${styles.Icon__filled} ${styles.Icon__colorPrimary}`}
          >
            favorite
          </span>
          <p className={styles.HealthCard_percentage}>78%</p>
        </div>
      </div>
      <ul className={`${styles.Dashboard_card} ${styles.QuickLinks}`}>
        <li className={styles.QuickLinks_item}>
          <span className="material-symbols-rounded">receipt_long</span>
          <p>Bill History</p>
        </li>
        <li className={styles.QuickLinks_item}>
          <span className="material-symbols-rounded">inventory</span>
          <p>My Inventory</p>
        </li>
        <li className={styles.QuickLinks_item}>
          <span className="material-symbols-rounded">priority</span>
          <p>Priority Actions</p>
        </li>
        <li className={styles.QuickLinks_item}>
          <span className="material-symbols-rounded">speed</span>
          <p>Benchmarking</p>
        </li>
        <li className={`${styles.QuickLinks_item} ${styles.Icon__filled}`}>
          <span className="material-symbols-rounded">store</span>
          <p>My Properties</p>
        </li>
        <li className={styles.QuickLinks_item}>
          <span className="material-symbols-rounded">handshake</span>
          <p>Partners</p>
        </li>
      </ul>
      <button
        className={`${styles.Dashboard_button} ${styles.Dashboard_button__primary} ${styles.Dashboard_button__withIcon}`}
        onClick={() => navigate("/upload")}
      >
        <span className="material-symbols-rounded">add</span>
        <p>Add a Bill</p>
      </button>
      <div className={styles.Dashboard_card}>
        <div className={styles.Card_header}>
          <h3 className={styles.Card_title}>Priority Actions</h3>
          <span className="material-symbols-rounded">arrow_circle_right</span>
        </div>
        <ul className={styles.PriorityList}>
          <li className={styles.PriorityList_item}>
            <div
              className={`${styles.PriorityList_indicator} ${styles.PriorityList_indicator__high}`}
            />
            <p className={`${styles.Text_muted} ${styles.PriorityList_text}`}>
              Your evening usage is higher than similar cafes.
            </p>
          </li>
          <li className={styles.PriorityList_item}>
            <div
              className={`${styles.PriorityList_indicator} ${styles.PriorityList_indicator__med}`}
            />
            <p className={`${styles.Text_muted} ${styles.PriorityList_text}`}>
              Non-inverter appliances may be driving up costs.
            </p>
          </li>
        </ul>
      </div>
      <div className={styles.Dashboard_card}>
        <div className={styles.Card_header}>
          <h3 className={styles.Card_title}>Monthly Bill Trend</h3>
          <span className="material-symbols-rounded">info</span>
        </div>
        <div className={`${styles.MonthlyCard_placeholder} ${styles.Text_muted}`}>
          placeholder
        </div>
      </div>
      <div className={styles.Stats}>
        <div className={`${styles.Dashboard_card} ${styles.Stats_card}`}>
          <p className={`${styles.Stats_label} ${styles.Text_muted}`}>This Month</p>
          <div>
            <span className={styles.Stats_value}>18,236</span>
            <span className={`${styles.Stats_label} ${styles.Text_muted}`}>pesos</span>
          </div>
        </div>
        <div className={`${styles.Dashboard_card} ${styles.Stats_card}`}>
          <p className={`${styles.Stats_label} ${styles.Text_muted}`}>vs Last Month</p>
          <div>
            <span className={styles.Stats_value}>8.6%</span>
            <span className={`${styles.Stats_label} ${styles.Text_muted}`}>increase</span>
          </div>
        </div>
        <div className={`${styles.Dashboard_card} ${styles.Stats_card}`}>
          <p className={`${styles.Stats_label} ${styles.Text_muted}`}>Total Consumption</p>
          <div>
            <span className={styles.Stats_value}>312</span>
            <span className={`${styles.Stats_label} ${styles.Text_muted}`}>kWh</span>
          </div>
        </div>
        <div className={`${styles.Dashboard_card} ${styles.Stats_card}`}>
          <p className={`${styles.Stats_label} ${styles.Text_muted}`}>Cost per kWh</p>
          <div>
            <span className={styles.Stats_value}>5.85</span>
            <span className={`${styles.Stats_label} ${styles.Text_muted}`}>pesos</span>
          </div>
        </div>
      </div>
    </div>
  );
}

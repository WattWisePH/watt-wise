import { useNavigate } from "react-router";

import {
  BellIcon,
  ReceiptIcon,
  ClipboardTextIcon,
  CheckSquareIcon,
  GaugeIcon,
  StorefrontIcon,
  HandshakeIcon,
  PlusIcon,
  ArrowCircleRightIcon,
  SealWarningIcon,
  WarningIcon,
  CaretDownIcon,
  CoffeeIcon,
} from "@phosphor-icons/react";

import styles from "./Dashboard.module.css";
import duotone from "../../styles/DuotoneIcon.module.css";
import { MonthlyBillChart } from "./components/MonthlyBillChart";
import { DashboardStats } from "./components/DashboardStats";
import { HealthScoreGauge } from "../../components/HealthScoreGauge";

const BILL_HISTORY = [
  { month: "Apr", amount: 15420 },
  { month: "May", amount: 16810 },
  { month: "Jun", amount: 15990 },
  { month: "Jul", amount: 17250 },
  { month: "Aug", amount: 16790 },
  { month: "Sep", amount: 18236 },
];

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
          <CoffeeIcon size={24} className={duotone.navy} />
          <div className={styles.Selector_label}>Cafe Marie</div>
          <CaretDownIcon
            size={16}
            weight="bold"
            className={styles.Selector_caret}
          />
        </div>
        <BellIcon size={24} className={duotone.amber} />
      </div>
      <HealthScoreGauge
        score={78}
        label="Good"
        insight="Better than 65% of similar cafes"
      />
      <ul className={`${styles.Dashboard_card} ${styles.QuickLinks}`}>
        <li className={styles.QuickLinks_item}>
          <ReceiptIcon size={24} className={duotone.green} />
          <p>Bill History</p>
        </li>
        <li className={styles.QuickLinks_item}>
          <ClipboardTextIcon size={24} className={duotone.navy} />
          <p>My Appliances</p>
        </li>
        <li className={styles.QuickLinks_item}>
          <CheckSquareIcon size={24} className={duotone.green} />
          <p>Priority Actions</p>
        </li>
        <li className={styles.QuickLinks_item}>
          <GaugeIcon size={24} className={duotone.navy} />
          <p>Benchmark</p>
        </li>
        <li className={styles.QuickLinks_item}>
          <StorefrontIcon size={24} className={duotone.green} />
          <p>My Establishments</p>
        </li>
        <li className={styles.QuickLinks_item}>
          <HandshakeIcon size={24} className={duotone.navy} />
          <p>Partners</p>
        </li>
      </ul>
      <button
        className={`${styles.Dashboard_button} ${styles.Dashboard_button__primary} ${styles.Dashboard_button__withIcon}`}
        onClick={() => navigate("/upload")}
      >
        <PlusIcon size={24} />
        <p>Add a Bill</p>
      </button>
      <div className={styles.Dashboard_card}>
        <div className={styles.Card_header}>
          <h3 className={styles.Card_title}>Priority Actions</h3>
          <ArrowCircleRightIcon size={24} />
        </div>
        <ul className={styles.PriorityList}>
          <li className={styles.PriorityList_item}>
            <SealWarningIcon size={18} className={`${duotone.red}`} />
            <p className={`${styles.Text_muted} ${styles.PriorityList_text}`}>
              Your evening usage is higher than similar cafes.
            </p>
          </li>
          <li className={styles.PriorityList_item}>
            <WarningIcon size={18} className={duotone.amber} />
            <p className={`${styles.Text_muted} ${styles.PriorityList_text}`}>
              Non-inverter appliances may be driving up costs.
            </p>
          </li>
        </ul>
      </div>
      <div className={styles.Dashboard_card}>
        <div className={styles.Card_header}>
          <h3 className={styles.Card_title}>Monthly Bill Chart</h3>
          {/* <InfoIcon size={24} /> */}
        </div>
        <MonthlyBillChart
          data={BILL_HISTORY}
          unit="pesos"
          monthsToShow={6}
          height={180}
        />
      </div>
      <DashboardStats
        currentMonthAmount={18236}
        currentMonthUnit="pesos"
        vsLastMonthPercent={8.6}
        totalConsumption={312}
        totalConsumptionUnit="kWh"
        costPerUnit={5.85}
        costPerUnitLabel="kWh"
      />
    </div>
  );
}

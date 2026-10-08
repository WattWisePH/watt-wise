import { Link, useNavigate } from "react-router";

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
} from "@phosphor-icons/react";

import styles from "./Dashboard.module.css";
import duotone from "../../styles/DuotoneIcon.module.css";
import { MonthlyBillChart } from "./components/MonthlyBillChart";
import { DashboardStats } from "./components/DashboardStats";
import { HealthScoreGauge } from "../../components/HealthScoreGauge";
import { EstablishmentSelector } from "../establishment/components/EstablishmentSelector";
import { NEXT_STEP, message, useInsights } from "../insights/useInsights";
import { scoreInsight } from "../../lib/insights";
import { useBills } from "./useBills";
import { billStats, billTrend } from "./billStats";

/** How many of the engine's actions the dashboard previews. */
const ACTIONS_SHOWN = 2;

/**
 * Energy dashboard component. This is what the user first sees when logged in.
 * Displays health score, quick links, top priority actions, and some statistics.
 */
export function Dashboard() {
  const navigate = useNavigate();
  const insights = useInsights();
  const ready = insights.status === "ready" ? insights.insights : null;
  const nextStep = NEXT_STEP[insights.status];
  const bills = useBills();
  const stats = bills.status === "ready" ? billStats(bills.bills) : null;

  return (
    <div className={styles.Dashboard}>
      <div className={styles.Dashboard_header}>
        <EstablishmentSelector />
        <BellIcon size={24} className={duotone.amber} />
      </div>
      <HealthScoreGauge
        score={ready?.result.healthScore}
        label={ready?.result.healthLabel}
        insight={
          insights.status === "ready"
            ? scoreInsight(insights.insights.result, insights.insights.benchmark)
            : message(insights)
        }
        action={
          nextStep && (
            <Link
              to={nextStep.to}
              className={`${styles.Dashboard_button} ${styles.Dashboard_button__primary} ${styles.Dashboard_button__withIcon} ${styles.Dashboard_button__link}`}
            >
              {nextStep.label}
              <ArrowCircleRightIcon size={20} />
            </Link>
          )
        }
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
      {insights.status === "ready" && (
        <div className={styles.Dashboard_card}>
          <div className={styles.Card_header}>
            <h3 className={styles.Card_title}>Priority Actions</h3>
            <ArrowCircleRightIcon size={24} />
          </div>
          {insights.insights.result.recommendations.length === 0 ? (
            <p className={styles.Text_muted}>
              Nothing needs attention right now — your usage looks healthy.
            </p>
          ) : (
            <ul className={styles.PriorityList}>
              {insights.insights.result.recommendations
                .slice(0, ACTIONS_SHOWN)
                .map((recommendation) => (
                  <li
                    key={recommendation.id}
                    className={styles.PriorityList_item}
                  >
                    {recommendation.impact === "high" ? (
                      <SealWarningIcon size={18} className={duotone.red} />
                    ) : (
                      <WarningIcon size={18} className={duotone.amber} />
                    )}
                    <p
                      className={`${styles.Text_muted} ${styles.PriorityList_text}`}
                    >
                      {recommendation.title}
                    </p>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
      <div className={styles.Dashboard_card}>
        <div className={styles.Card_header}>
          <h3 className={styles.Card_title}>Monthly Bill Chart</h3>
          {/* <InfoIcon size={24} /> */}
        </div>
        {bills.status === "ready" ? (
          <MonthlyBillChart
            data={billTrend(bills.bills)}
            unit="pesos"
            monthsToShow={6}
            height={180}
          />
        ) : (
          <div className={styles.MonthlyCard_placeholder}>
            {bills.status === "loading"
              ? "Loading your bills…"
              : "Couldn't load your bills."}
          </div>
        )}
      </div>
      {stats && (
        <DashboardStats
          currentMonthAmount={stats.amount}
          currentMonthUnit="pesos"
          vsLastMonthPercent={stats.vsLastPercent}
          totalConsumption={stats.kwhUsed}
          totalConsumptionUnit="kWh"
          costPerUnit={stats.costPerKwh}
          costPerUnitLabel="kWh"
        />
      )}
    </div>
  );
}

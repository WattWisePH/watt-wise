import { useMemo, useState } from "react";
import { Link } from "react-router";

import { PiggyBankIcon } from "@phosphor-icons/react";

import styles from "./Simulator.module.css";
import { toItems, totals } from "./savings";
import { SimulatorItemToggle } from "./components/SimulatorItemToggle";
import { MonthlyBillChart } from "../dashboard/components/MonthlyBillChart";
import { NEXT_STEP, message, useInsights } from "../insights/useInsights";

/**
 * How far the "with changes" bar drops, as a share of the "current" bar's
 * height, when every option is selected. Raise toward 1 for more movement.
 */
const FULL_SELECTION_DROP = 0.25;

/**
 * Where a before/after chart's bars start. Scaled to the saving with every
 * option selected, not the current selection, so the axis stays still while
 * toggling and each option moves the bar by its share. From zero, a 5%
 * saving is a couple of pixels on a phone.
 */
function axisMinFor(current: number, maxSaved: number): number {
  if (maxSaved <= 0) return 0;
  return Math.max(0, current - maxSaved / FULL_SELECTION_DROP);
}

const peso = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const Simulator = () => {
  const state = useInsights();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showProjection, setShowProjection] = useState(false);

  const insights = state.status === "ready" ? state.insights : null;
  const items = useMemo(() => (insights ? toItems(insights) : []), [insights]);
  const bill = insights?.basedOn ?? { amount: 0, kwhUsed: 0 };

  const handleItemToggle = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const selected = items.filter((item) => selectedItems.includes(item.id));
  const { php: totalPhp, kwh: totalKwh, percent: reductionPercent } = totals(selected, bill);
  // The most the options could save together; fixes the projection's axis.
  const maxPhp = totals(items, bill).php;

  const listMessage =
    state.status !== "ready"
      ? message(state)
      : state.insights.narrative.status === "pending"
        ? "Estimating savings for your actions…"
        : state.insights.narrative.status === "failed"
          ? "Savings estimates aren't available right now. Try again later."
          : items.length === 0
            ? "No actions with measurable savings — your usage looks healthy."
            : selectedItems.length === 0
              ? "Select an option below."
              : `Selected ${selectedItems.length} ${selectedItems.length === 1 ? "option" : "options"}.`;
  const nextStep =
    state.status !== "ready" ? NEXT_STEP[state.status] : undefined;

  return (
    <div className={styles.Simulator}>
      <section className={styles.Simulator_section}>
        <div>
          <h1 className={styles.Simulator_sectionTitle}>Savings Simulator</h1>
          <p className={`${styles.Simulator_sectionSubtitle}`}>
            Adjust the options below to see your potential savings.
          </p>
        </div>
        <div className={styles.Simulator_card}>
          <div className={styles.SimulatorCard_body}>
            <div className={styles.SimulatorCard_iconRing}>
              <PiggyBankIcon className={styles.SimulatorCard_icon} />
            </div>
            <div className={styles.SimulatorCard_info}>
              <div className={styles.SimulatorCard_header}>
                Estimated Monthly Savings
              </div>
              <div className={styles.SimulatorCard_valueRow}>
                <p className={styles.SimulatorCard_savingsNumber}>
                  <span className={styles.SimulatorCard_currencyUnit}>₱</span>
                  {peso(totalPhp)}
                </p>
                <div className={styles.SimulatorCard_reductionBadge}>
                  {reductionPercent.toFixed(1)}% reduction
                </div>
              </div>
            </div>
          </div>
        </div>
        {items.length > 0 && (
          <button
            className={styles.Simulator_button}
            onClick={() => setShowProjection((open) => !open)}
            aria-expanded={showProjection}
          >
            {showProjection
              ? "Hide Detailed Projection"
              : "View Detailed Projection"}
          </button>
        )}
        {showProjection && items.length > 0 && (
          <div className={styles.Simulator_projection}>
            <div>
              <h2 className={styles.Simulator_projectionTitle}>
                Monthly bill (₱)
              </h2>
              <MonthlyBillChart
                data={[
                  { month: "Current", amount: bill.amount },
                  { month: "With changes", amount: bill.amount - totalPhp },
                ]}
                color="primary"
                showAverage={false}
                unit="pesos"
                valueLabel={(n) => `₱${peso(n)}`}
                axisMin={axisMinFor(bill.amount, maxPhp)}
              />
              <p className={styles.Simulator_projectionDelta}>
                −₱{peso(totalPhp)} (−{totalKwh.toLocaleString()} kWh) a month,{" "}
                {reductionPercent.toFixed(1)}% lower
              </p>
            </div>
            <p className={styles.Simulator_sectionSubtitle}>
              Bars start above zero to make the change easier to see. Estimates
              are AI-generated from your bill and appliance survey.
            </p>
          </div>
        )}
        <p className={styles.Simulator_sectionSubtitle}>
          {listMessage}
          {nextStep && (
            <>
              {" "}
              <Link to={nextStep.to}>{nextStep.label}</Link>
            </>
          )}
        </p>
        <div className={styles.Simulator_itemList}>
          {items.map((item) => (
            <SimulatorItemToggle
              key={item.id}
              item={item}
              handleToggle={() => handleItemToggle(item.id)}
              isEnabled={selectedItems.includes(item.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

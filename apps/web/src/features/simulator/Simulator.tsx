import { useMemo, useState } from "react";

import {
  SnowflakeIcon,
  HourglassIcon,
  PackageIcon,
  PlugIcon,
  PiggyBankIcon,
} from "@phosphor-icons/react";

import styles from "./Simulator.module.css";
import type { SimulatorItem } from "./types";
import duotone from "../../styles/DuotoneIcon.module.css";
import { SimulatorItemToggle } from "./components/SimulatorItemToggle";

const BASELINE_MONTHLY_BILL = 18200;

export const Simulator = () => {
  const simulatorData: SimulatorItem[] = [
    {
      id: 0,
      icon: SnowflakeIcon,
      iconTint: duotone.navy,
      label: "Switch to inverter AC",
      estSavings: 1450,
    },
    {
      id: 1,
      icon: HourglassIcon,
      iconTint: duotone.amber,
      label: "Optimize operating hours",
      estSavings: 950,
    },
    {
      id: 2,
      icon: PackageIcon,
      iconTint: duotone.green,
      label: "Replace old refrigerator",
      estSavings: 750,
    },
    {
      id: 3,
      icon: PlugIcon,
      iconTint: duotone.amber,
      label: "Reduce idle appliance usage",
      estSavings: 350,
    },
  ];

  const [selectedItems, setSelectedItems] = useState<Array<number>>([]);

  const handleItemToggle = (itemId: number) => {
    setSelectedItems((prevItems) => {
      if (prevItems.includes(itemId)) {
        return prevItems.filter((prevItem) => prevItem !== itemId);
      } else {
        return [...prevItems, itemId];
      }
    });
  };

  const totalSavings = useMemo(
    () =>
      simulatorData
        .filter((item) => selectedItems.includes(item.id))
        .reduce((sum, item) => sum + item.estSavings, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedItems],
  );

  const reductionPercent = useMemo(
    () => (totalSavings / BASELINE_MONTHLY_BILL) * 100,
    [totalSavings],
  );

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
                  {totalSavings.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <div className={styles.SimulatorCard_reductionBadge}>
                  {reductionPercent.toFixed(1)}% reduction
                </div>
              </div>
            </div>
          </div>
        </div>
        <button className={styles.Simulator_button}>
          View Detailed Projection
        </button>
        <p className={styles.Simulator_sectionSubtitle}>
          {selectedItems.length === 0
            ? "Select an option below."
            : `Selected ${selectedItems.length} ${
                selectedItems.length === 1 ? "option" : "options"
              }.`}
        </p>
        <div className={styles.Simulator_itemList}>
          {simulatorData.map((item) => {
            return (
              <SimulatorItemToggle
                key={item.label}
                item={item}
                handleToggle={() => handleItemToggle(item.id)}
                isEnabled={selectedItems.includes(item.id)}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
};

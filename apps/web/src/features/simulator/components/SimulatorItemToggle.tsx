import styles from "../Simulator.module.css";
import type { SimulatorItem } from "../types";
import { CheckIcon } from "@phosphor-icons/react";

interface SimulatorItemToggleProps {
  item: SimulatorItem;
  isEnabled: boolean;
  handleToggle: () => void;
}

export const SimulatorItemToggle = ({
  item,
  isEnabled,
  handleToggle,
}: SimulatorItemToggleProps) => {
  const ItemIcon = item.icon;
  return (
    <div onClick={handleToggle} className={styles.SimulatorItem_container}>
      <div className={styles.SimulatorItem_icon}>
        <ItemIcon className={item.iconTint} />
      </div>
      <div className={styles.SimulatorItem_contentLayout}>
        <div className={styles.SimulatorItem_label}>{item.label}</div>
        <div className={styles.SimulatorItem_description}>
          Estimated savings: ₱{item.estSavings} / month
        </div>
      </div>
      <div className={styles.SimulatorItem_toggleWrapper}>
        <input
          type="checkbox"
          checked={isEnabled}
          readOnly
          className={styles.SimulatorItem_toggle}
        />
        {isEnabled && (
          <CheckIcon
            weight="bold"
            size={18}
            className={styles.SimulatorItem_toggleIcon}
          />
        )}
      </div>
    </div>
  );
};

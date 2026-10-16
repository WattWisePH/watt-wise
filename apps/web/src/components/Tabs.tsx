import styles from "./Tabs.module.css";

export interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  /** The id of the tab shown as selected. */
  selected: string | undefined;
  onSelect: (id: string) => void;
}

/**
 * A row of equal-width tabs. Controlled: the caller decides what is
 * selected and what choosing a tab does, so the same row works over routes
 * or over local state.
 */
export const Tabs = ({ tabs, selected, onSelect }: TabsProps) => (
  <div className={styles.Tabs_background}>
    <ul className={styles.Tabs_container} role="tablist">
      {tabs.map((tab) => {
        const isSelected = tab.id === selected;
        return (
          <li key={tab.id} className={styles.Tabs_itemContainer}>
            <button
              role="tab"
              aria-selected={isSelected}
              className={`${styles.Tabs_button} ${isSelected ? styles.Tabs_button__selected : ""}`}
              onClick={() => onSelect(tab.id)}
            >
              <div className={styles.Tabs_label}>{tab.label}</div>
            </button>
          </li>
        );
      })}
    </ul>
  </div>
);

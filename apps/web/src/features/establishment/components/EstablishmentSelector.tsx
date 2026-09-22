/**
 * Dropdown to view the active establishment and switch between the user's
 * establishments. Used in Dashboard's header.
 */

import { useState } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";

import styles from "./EstablishmentSelector.module.css";
import { EstablishmentIcon } from "./EstablishmentIcon";
import duotone from "../../../styles/DuotoneIcon.module.css";
import { useEstablishment } from "../hooks/useEstablishment";

export function EstablishmentSelector() {
  const { establishments, activeEstablishment, setActiveEstablishmentId } =
    useEstablishment();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details
      className={styles.Selector}
      open={isOpen}
      onToggle={(e) => {
        setIsOpen(e.currentTarget.open);
      }}
    >
      <summary className={styles.Selector_summary}>
        {activeEstablishment && (
          <EstablishmentIcon
            establishment={activeEstablishment}
            size={24}
            className={duotone.navy}
          />
        )}
        <div className={styles.Selector_label}>
          {activeEstablishment?.name || "Set your establishment first."}
        </div>
        <CaretDownIcon
          size={16}
          weight="bold"
          className={styles.Selector_caret}
        />
      </summary>
      {establishments.length > 0 && (
        <ul className={styles.Selector_menu}>
          {establishments.map((establishment) => (
            <li key={establishment.id}>
              <button
                className={styles.Selector_menuItem}
                onClick={() => {
                  setIsOpen(false);
                  return setActiveEstablishmentId(establishment.id);
                }}
              >
                <EstablishmentIcon
                  establishment={establishment}
                  size={20}
                  className={`${styles.Selector_icon} ${activeEstablishment?.name == establishment.name ? duotone.navy : ""}`}
                />
                {establishment.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

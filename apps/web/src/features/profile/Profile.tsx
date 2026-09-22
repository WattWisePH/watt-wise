import { useNavigate } from "react-router";
import {
  CaretRightIcon,
  PasswordIcon,
  QuestionIcon,
  SignOutIcon,
} from "@phosphor-icons/react";

const logo = "/images/watty-logo.svg";
import { logout } from "../../lib/auth";
import styles from "./Profile.module.css";
import { useEstablishment } from "../establishment/hooks/useEstablishment";
import { EstablishmentIcon } from "../establishment/EstablishmentIcon";

export const Profile = () => {
  const navigate = useNavigate();
  const { establishments, activeEstablishmentId, setActiveEstablishmentId } =
    useEstablishment();

  async function handleLogOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={styles.Profile}>
      {/* Account Details */}
      <section className={styles.Profile_section}>
        <div className={styles.Profile_accountDetails}>
          <img src={logo} alt="Logo" className={styles.Profile_logo} />
          <h1 className={styles.Profile_sectionTitle}>Username</h1>
          <p className={styles.Profile_sectionSubtitle}>email@example.com</p>
        </div>
      </section>
      {/* Establishments */}
      <section className={styles.Profile_section}>
        <div>
          <h3 className={styles.Profile_sectionTitle}>My Establishments</h3>
          <p className={styles.Profile_sectionSubtitle}>
            Change to one of your existing establishments or add a new one.
          </p>
        </div>
        <ul className={styles.EstablishmentsList_container}>
          {establishments.map((establishment) => {
            const active = establishment.id === activeEstablishmentId;
            return (
              <li key={establishment.id}>
                <button
                  className={`${styles.EstablishmentsList_button} ${
                    active ? styles.EstablishmentsList_button__active : ""
                  }`}
                  onClick={() => setActiveEstablishmentId(establishment.id)}
                >
                  <div className={styles.EstablishmentsList_icon}>
                    <EstablishmentIcon
                      establishment={establishment}
                      size={20}
                    />
                  </div>
                  <div
                    className={styles.EstablishmentsList_establishmentContent}
                  >
                    <p className={styles.EstablishmentsList_establishmentName}>
                      {establishment.name}
                    </p>
                    <p>{establishment.address}</p>
                  </div>
                  {active && "Selected"}
                  <CaretRightIcon size={20} />
                </button>
              </li>
            );
          })}
          <li>
            <button
              className={`${styles.EstablishmentsList_button} ${styles.EstablishmentsList_button__add}`}
              onClick={() => navigate("/establishment")}
            >
              {establishments.length === 0
                ? "Add Your First Establishment"
                : "Add New Establishment"}
            </button>
          </li>
        </ul>
      </section>
      {/* Account Settings */}
      <section>
        <div>
          <h3 className={styles.Profile_sectionTitle}>Account</h3>
        </div>
        <ul className={styles.AccountOptions_container}>
          <li>
            <button className={styles.AccountOptions_button}>
              <PasswordIcon size={28} className={styles.AccountOptions_icon} />
              Change Password
            </button>
          </li>
          <li>
            <button className={styles.AccountOptions_button}>
              <QuestionIcon size={28} className={styles.AccountOptions_icon} />
              Help Center
            </button>
          </li>
          <li>
            <button
              onClick={handleLogOut}
              className={`${styles.AccountOptions_button} ${styles.AccountOptions_button__logout}`}
            >
              <SignOutIcon size={28} className={styles.AccountOptions_icon} />
              Log Out
            </button>
          </li>
        </ul>
      </section>
    </div>
  );
};

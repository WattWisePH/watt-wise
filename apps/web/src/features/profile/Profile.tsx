import styles from "./Profile.module.css";
import logo from "../../../public/images/watty-logo.svg";
import { useNavigate } from "react-router";
import { logout } from "../../lib/auth";
import {
  CoffeeIcon,
  CaretRightIcon,
  HouseIcon,
  PasswordIcon,
  QuestionIcon,
  SignOutIcon,
} from "@phosphor-icons/react";

export const Profile = () => {
  const navigate = useNavigate();

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
      {/* Properties */}
      <section className={styles.Profile_section}>
        <div>
          <h3 className={styles.Profile_sectionTitle}>My Properties</h3>
          <p className={styles.Profile_sectionSubtitle}>
            Change to one of your existing properties or add a new one.
          </p>
        </div>
        <ul className={styles.PropertiesList_container}>
          <li>
            <button
              className={`${styles.PropertiesList_button} ${styles.PropertiesList_button__active}`}
            >
              <div className={styles.PropertiesList_icon}>
                <CoffeeIcon size={20} />
              </div>
              <div className={styles.PropertiesList_propertyContent}>
                <p className={styles.PropertiesList_propertyName}>Cafe Marie</p>
                <p>Jaro, Iloilo</p>
              </div>
              Selected
              <CaretRightIcon size={20} />
            </button>
          </li>
          <li>
            <button className={styles.PropertiesList_button}>
              {" "}
              <div className={styles.PropertiesList_icon}>
                <HouseIcon size={20} />
              </div>
              <div className={styles.PropertiesList_propertyContent}>
                <p className={styles.PropertiesList_propertyName}>Home</p>
                <p>Iloilo City</p>
              </div>
              <CaretRightIcon size={20} />
            </button>
          </li>
          <li>
            <button
              className={`${styles.PropertiesList_button} ${styles.PropertiesList_button__add}`}
            >
              Add New Property
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

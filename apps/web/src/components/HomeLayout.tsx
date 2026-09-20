import { Outlet } from "react-router";

import { NavigationBar } from "../features/navigation-bar/NavigationBar";
import styles from "./HomeLayout.module.css";

export const HomeLayout = () => {
  return (
    <div className={styles.HomeLayout}>
      <Outlet />
      <NavigationBar />
    </div>
  );
};

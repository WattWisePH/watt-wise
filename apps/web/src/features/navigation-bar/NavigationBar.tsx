import navStyles from "./NavigationBar.module.css";
import { useNavigate, useLocation } from "react-router";
import {
  HouseIcon,
  LightbulbIcon,
  LeafIcon,
  UserIcon,
  type Icon,
} from "@phosphor-icons/react";

interface NavBarItem {
  icon: Icon;
  itemName: string;
  route: string;
}

export const NavigationBar = () => {
  const navBarItems: NavBarItem[] = [
    { icon: HouseIcon, itemName: "Home", route: "/dashboard" },
    { icon: LightbulbIcon, itemName: "Insights", route: "/insights" },
    {
      icon: LeafIcon,
      itemName: "Simulator",
      route: "/simulator",
    },
    { icon: UserIcon, itemName: "Profile", route: "/profile" },
  ];
  const { pathname } = useLocation();
  const currentRoute = pathname.split("/")[1];
  const navigate = useNavigate();

  const handleRedirect = (route: string) => {
    navigate(route);
  };

  return (
    <div className={navStyles.NavBar}>
      <ul className={navStyles.NavBar_layout}>
        {navBarItems.map((navItem) => {
          const isSelected = currentRoute === navItem.route.split("/")[1];
          const NavIcon = navItem.icon;
          return (
            <li key={navItem.route}>
              <button
                className={`${navStyles.NavBar_menuButton} ${isSelected ? navStyles.NavBar_menuButton__selected : ""}`}
                onClick={() => {
                  handleRedirect(navItem.route);
                }}
              >
                <div
                  className={`${navStyles.NavBar_menuIconContainer} ${isSelected ? navStyles.NavBar_menuIconContainer__selected : ""}`}
                >
                  <NavIcon
                    weight={isSelected ? "fill" : "regular"}
                    className={`${navStyles.NavBar_menuicon} ${isSelected ? navStyles.NavBar_menuicon__selected : ""}`}
                  />
                </div>

                <p className={navStyles.NavBar_menuName}>{navItem.itemName}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

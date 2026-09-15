import navStyles from "./NavigationBar.module.css";
import duotone from "../../styles/DuotoneIcon.module.css";
import { useNavigate, useLocation } from "react-router";
import {
  HouseIcon,
  LightbulbIcon,
  LeafIcon,
  UserIcon,
  type Icon,
} from "@phosphor-icons/react";

type NavTint = "navy" | "amber" | "green" | "neutral";

interface NavBarItem {
  icon: Icon;
  itemName: string;
  route: string;
  tint: NavTint;
}

export const NavigationBar = () => {
  const navBarItems: NavBarItem[] = [
    { icon: HouseIcon, itemName: "Home", route: "/dashboard", tint: "navy" },
    {
      icon: LightbulbIcon,
      itemName: "Insights",
      route: "/insights",
      tint: "amber",
    },
    {
      icon: LeafIcon,
      itemName: "Simulator",
      route: "/simulator",
      tint: "green",
    },
    {
      icon: UserIcon,
      itemName: "Profile",
      route: "/profile",
      tint: "neutral",
    },
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
          const tintClass = duotone[navItem.tint];
          return (
            <li key={navItem.route}>
              <button
                className={`${navStyles.NavBar_menuButton} ${isSelected ? navStyles.NavBar_menuButton__selected : ""}`}
                onClick={() => {
                  handleRedirect(navItem.route);
                }}
              >
                <div className={navStyles.NavBar_menuIconContainer}>
                  <NavIcon
                    weight={isSelected ? "duotone" : "regular"}
                    className={`${navStyles.NavBar_menuicon} ${isSelected ? tintClass : ""}`}
                  />
                </div>

                <p
                  className={`${navStyles.NavBar_menuName} ${isSelected ? navStyles[`NavBar_menuName__${navItem.tint}`] : ""}`}
                >
                  {navItem.itemName}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

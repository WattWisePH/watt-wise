import type { Icon } from "@phosphor-icons/react";

export interface SimulatorItem {
  id: number;
  icon: Icon;
  iconTint: string;
  label: string;
  estSavings: number;
}

import type { Icon } from "@phosphor-icons/react";

export interface SimulatorItem {
  id: number;
  icon: Icon;
  label: string;
  estSavings: number;
}

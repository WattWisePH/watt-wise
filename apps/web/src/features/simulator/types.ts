import type { Icon } from "@phosphor-icons/react";

import type { Savings } from "../../lib/insights";

export interface SimulatorItem {
  /** The recommendation's id, or the model suggestion's "ai-<slug>" id. */
  id: string;
  icon: Icon;
  iconTint: string;
  label: string;
  savings: Savings;
}

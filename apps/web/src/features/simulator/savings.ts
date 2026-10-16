/**
 * The simulator's arithmetic, kept out of the component so it can be tested.
 */

import {
  ChartBarIcon,
  HourglassIcon,
  PlugIcon,
  SnowflakeIcon,
  SparkleIcon,
  type Icon,
} from "@phosphor-icons/react";

import type { SimulatorItem } from "./types";
import duotone from "../../styles/DuotoneIcon.module.css";
import { archivedIds } from "../../lib/insights";
import type { ReadyInsights } from "../insights/useInsights";

/** Icon per rule-engine category; model suggestions get a sparkle. */
const CATEGORY_ICONS: Record<string, [Icon, string]> = {
  benchmark: [ChartBarIcon, duotone.navy],
  usage: [HourglassIcon, duotone.amber],
  baseline: [PlugIcon, duotone.amber],
  appliances: [SnowflakeIcon, duotone.navy],
};

/**
 * The same actions Priority Actions shows, each with the model's savings
 * estimate. Left out: anything already marked done or dismissed on this
 * bill, and anything the model thinks saves nothing — a toggle that moves
 * no number is noise in a simulator.
 */
export function toItems({ result, narrative, basedOn, archived }: ReadyInsights): SimulatorItem[] {
  if (narrative.status !== "ready") return [];

  const rules = result.recommendations.map((r) => {
    const [icon, iconTint] = CATEGORY_ICONS[r.category] ?? [PlugIcon, duotone.green];
    return {
      id: r.id,
      icon,
      iconTint,
      label: r.title,
      savings: narrative.ruleSavings[r.id] ?? { kwh: 0, php: 0 },
    };
  });
  const suggestions = narrative.actions.map((a) => ({
    id: a.id,
    icon: SparkleIcon,
    iconTint: duotone.green,
    label: a.title,
    savings: a.savings,
  }));

  const hidden = archivedIds(archived, basedOn.billId);
  return [...rules, ...suggestions].filter(
    (item) => item.savings.kwh > 0 && !hidden.has(item.id),
  );
}

/**
 * What a set of items saves together, capped at the bill: estimates are
 * added up independently, and a projection below zero would be nonsense on
 * screen. Pesos and kWh drop by the same share, since the pesos are the kWh
 * at the bill's rate.
 */
export function totals(
  items: SimulatorItem[],
  bill: { amount: number; kwhUsed: number },
): { php: number; kwh: number; percent: number } {
  const php = Math.min(
    items.reduce((sum, item) => sum + item.savings.php, 0),
    bill.amount,
  );
  const kwh = Math.min(
    items.reduce((sum, item) => sum + item.savings.kwh, 0),
    bill.kwhUsed,
  );
  return { php, kwh, percent: bill.amount > 0 ? (php / bill.amount) * 100 : 0 };
}

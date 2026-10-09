/**
 * The dashboard's bill figures, derived from an establishment's bills.
 *
 * Takes the list as the API returns it — newest period first — so the
 * latest statement is the head, the same bill the health score describes.
 */

import type { Bill } from "../../lib/api";
import type { BillTrendPoint } from "./components/MonthlyBillChart";

export interface BillStats {
  amount: number;
  kwhUsed: number;
  /** Null without an earlier bill, or when it was ₱0 (no base to compare). */
  vsLastPercent: number | null;
  /** Null for a 0 kWh bill, which the API accepts. */
  costPerKwh: number | null;
}

const round = (value: number, places: number) =>
  Math.round(value * 10 ** places) / 10 ** places;

/** The latest bill's figures, or null when there are no bills. */
export function billStats(bills: Bill[]): BillStats | null {
  const [latest, previous] = bills;
  if (!latest) return null;
  return {
    amount: latest.amount,
    kwhUsed: latest.kwhUsed,
    vsLastPercent:
      previous && previous.amount > 0
        ? round(((latest.amount - previous.amount) / previous.amount) * 100, 1)
        : null,
    costPerKwh: latest.kwhUsed > 0 ? round(latest.amount / latest.kwhUsed, 2) : null,
  };
}

/**
 * One chart bar per bill, oldest first, labelled by the month its period
 * ended in. Read as UTC: periodEnd is a bare date, which JavaScript parses
 * as UTC midnight, and a local-time read would put the 1st in the previous
 * month for anyone west of Greenwich.
 */
export function billTrend(bills: Bill[]): BillTrendPoint[] {
  return bills
    .map((bill) => ({
      month: new Date(bill.periodEnd ?? bill.createdAt).toLocaleString("en", {
        month: "short",
        timeZone: "UTC",
      }),
      amount: bill.amount,
    }))
    .reverse();
}

/**
 * What an establishment's bill history says.
 *
 * The comparisons are worked out here, in code, and handed to the model as
 * finished facts. Passing it the raw bills and letting it say "your usage
 * rose 18%" would put a number on screen that no rule produced — computed
 * by something that is unreliable at arithmetic and cannot show its
 * working. Same division as everywhere else: rules compute, the model
 * explains.
 *
 * Pure functions, so the arithmetic is tested directly rather than through
 * a network call.
 */

/** The minimum a bill needs to take part in a comparison. */
export interface TrendBill {
  kwhUsed: number;
  periodEnd: string | null;
}

export interface BillTrend {
  /** Bills on record, including the latest. */
  billCount: number;
  /** Change in kWh against the bill before it; null without one. */
  vsPreviousPct: number | null;
  /** Change against the mean of the earlier bills; null without any. */
  vsAveragePct: number | null;
  /** Mean kWh of the earlier bills, rounded; null without any. */
  averageKwh: number | null;
  /** The highest earlier month, for context; null without any. */
  highestKwh: number | null;
}

/** How many months back a comparison looks. Beyond this the tariff and the
 *  business have usually both moved on enough to make it misleading. */
const WINDOW = 6;

const round = (value: number) => Math.round(value);

/** Percent change from `from` to `to`, or null when there's no base. */
function changePct(to: number, from: number): number | null {
  if (from <= 0) return null;
  return round(((to - from) / from) * 100);
}

/**
 * Summarise a history. Bills arrive newest first, as listBills returns
 * them, so the head is the current statement and the rest are its past.
 */
export function billTrend(bills: TrendBill[]): BillTrend {
  const [latest, ...older] = bills;
  const earlier = older.slice(0, WINDOW - 1);

  if (!latest || earlier.length === 0) {
    return {
      billCount: bills.length,
      vsPreviousPct: null,
      vsAveragePct: null,
      averageKwh: null,
      highestKwh: null,
    };
  }

  const average = earlier.reduce((sum, b) => sum + b.kwhUsed, 0) / earlier.length;

  return {
    billCount: bills.length,
    vsPreviousPct: changePct(latest.kwhUsed, earlier[0].kwhUsed),
    vsAveragePct: changePct(latest.kwhUsed, average),
    averageKwh: round(average),
    highestKwh: Math.max(...earlier.map((b) => b.kwhUsed)),
  };
}

/**
 * The history as a sentence for the prompt.
 *
 * A single bill gets an explicit "no history" line rather than silence: a
 * model given nothing on the subject will happily invent a trend, and
 * saying so plainly is what stops it.
 *
 * Seasonality is flagged in the same breath. March to May is summer here,
 * and a rise in that window is usually the weather rather than waste —
 * without the caution, a confident "your usage is up 30%" reads as a
 * problem every April.
 */
export function describeTrend(trend: BillTrend): string {
  if (trend.billCount <= 1 || trend.averageKwh === null) {
    return "This is the first bill on record, so there is no history yet. Do not describe any trend, increase or decrease.";
  }

  const parts = [`This is bill number ${trend.billCount} on record.`];

  if (trend.vsPreviousPct !== null) {
    parts.push(
      trend.vsPreviousPct === 0
        ? "Consumption is unchanged from the previous bill."
        : `Consumption is ${Math.abs(trend.vsPreviousPct)}% ${trend.vsPreviousPct > 0 ? "higher" : "lower"} than the previous bill.`,
    );
  }

  if (trend.vsAveragePct !== null) {
    parts.push(
      `Their earlier bills average ${trend.averageKwh} kWh, so this month is ${Math.abs(trend.vsAveragePct)}% ${trend.vsAveragePct >= 0 ? "above" : "below"} their own average.`,
    );
  }

  if (trend.highestKwh !== null) {
    parts.push(`Their highest earlier month was ${trend.highestKwh} kWh.`);
  }

  parts.push(
    "Note that March to May is summer in the Philippines, when cooling raises consumption for most people — do not present a rise in those months as waste without saying so.",
  );

  return parts.join(" ");
}

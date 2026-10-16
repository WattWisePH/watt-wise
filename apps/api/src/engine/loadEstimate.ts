/**
 * What each appliance probably costs, and how much of the bill that leaves
 * unexplained.
 *
 * This is the piece that lets the app say something specific. A list of
 * appliance names supports only generic advice; "your aircon is about 60%
 * of your bill" is the sentence a user actually acts on, and it needs
 * arithmetic rather than a model's opinion.
 *
 * The arithmetic is deliberately plain:
 *
 *   kWh/month = watts x dutyCycle x hoursPerDay x count x 30 / 1000
 *
 * Thirty days rather than the real billing period: the period varies by a
 * day or two, and correcting for that would imply a precision the wattage —
 * a typical value, not a measurement — does not have.
 *
 * The honest part is the remainder. These estimates will not sum to the
 * metered total, and the gap is reported rather than hidden: a breakdown
 * covering 70% of a bill is useful, a breakdown silently presented as
 * complete is misleading.
 */

/** What an estimate needs from an appliance. */
export interface LoadInput {
  type: string;
  count: number;
  hoursPerDay?: number;
  typicalWatts?: number;
  dutyCycle: number;
}

/** One appliance's estimated share. */
export interface LoadItem {
  type: string;
  count: number;
  kwhPerMonth: number;
  /** Share of the bill's metered consumption, 0-100. */
  sharePct: number;
}

export interface LoadBreakdown {
  /** Estimated appliances, largest first. */
  items: LoadItem[];
  /** Everything the estimates account for. */
  accountedKwh: number;
  /** Metered consumption they were compared against. */
  meteredKwh: number;
  /** What the estimates cover, 0-100. Above 100 when they overshoot. */
  coveragePct: number;
  /**
   * Appliances left out because nobody has sourced a wattage for them, or
   * because the survey never asked their hours. Named so the shortfall can
   * be explained instead of looking like the appliance drawing nothing.
   */
  unestimated: string[];
}

const DAYS_PER_MONTH = 30;

const round = (value: number, places = 0) =>
  Math.round(value * 10 ** places) / 10 ** places;

/**
 * One appliance's monthly consumption, or null when it can't be estimated.
 *
 * Unknown hours return null rather than a default. A default would be a
 * guess wearing the clothes of a calculation, and the whole point of this
 * module is that every number traces to something the user told us or a
 * table someone can check.
 */
export function applianceKwh(appliance: LoadInput): number | null {
  if (appliance.typicalWatts === undefined || appliance.hoursPerDay === undefined) {
    return null;
  }
  const kwh =
    (appliance.typicalWatts *
      appliance.dutyCycle *
      appliance.hoursPerDay *
      appliance.count *
      DAYS_PER_MONTH) /
    1000;
  return round(kwh, 1);
}

/**
 * Estimate the whole survey against a bill.
 *
 * Coverage can exceed 100%: typical wattages are generous for some units,
 * and a user may overstate hours. That is reported as it stands rather than
 * clamped — an estimate claiming more than the meter recorded is a signal
 * the figures need looking at, and hiding it would remove the only clue.
 */
export function loadBreakdown(
  appliances: LoadInput[],
  meteredKwh: number,
): LoadBreakdown {
  const items: LoadItem[] = [];
  const unestimated: string[] = [];

  for (const appliance of appliances) {
    const kwh = applianceKwh(appliance);
    if (kwh === null) {
      unestimated.push(appliance.type);
      continue;
    }
    items.push({
      type: appliance.type,
      count: appliance.count,
      kwhPerMonth: kwh,
      sharePct: meteredKwh > 0 ? round((kwh / meteredKwh) * 100) : 0,
    });
  }

  items.sort((a, b) => b.kwhPerMonth - a.kwhPerMonth);
  const accountedKwh = round(
    items.reduce((sum, item) => sum + item.kwhPerMonth, 0),
    1,
  );

  return {
    items,
    accountedKwh,
    meteredKwh,
    coveragePct: meteredKwh > 0 ? round((accountedKwh / meteredKwh) * 100) : 0,
    unestimated,
  };
}

/**
 * The breakdown as sentences for the prompt.
 *
 * Stated as facts the model may repeat, never as raw figures for it to
 * work with — the same rule the bill history follows. The coverage line is
 * included deliberately: a model told only the shares would present them as
 * the whole picture.
 */
export function describeLoad(breakdown: LoadBreakdown): string {
  if (breakdown.items.length === 0) {
    return (
      "No appliance consumption could be estimated, because hours of use or " +
      "typical wattage are missing. Do not estimate how much any appliance " +
      "uses or costs."
    );
  }

  const lines = breakdown.items.map(
    (item) =>
      `- ${item.count}x ${item.type}: about ${item.kwhPerMonth} kWh/month (${item.sharePct}% of the bill)`,
  );

  const coverage =
    breakdown.coveragePct > 110
      ? `These estimates come to ${breakdown.accountedKwh} kWh, which is MORE than the ${breakdown.meteredKwh} kWh actually metered — so the hours or wattages are overstated somewhere. Treat the shares as rough and say so.`
      : `Together these account for about ${breakdown.coveragePct}% of the ${breakdown.meteredKwh} kWh metered.`;

  const missing = breakdown.unestimated.length
    ? ` Not estimated, for want of hours of use: ${[...new Set(breakdown.unestimated)].join(", ")}.`
    : "";

  return `Estimated consumption per appliance:\n${lines.join("\n")}\n${coverage}${missing}`;
}

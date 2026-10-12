/**
 * Tests for the bill-history arithmetic.
 *
 * This exists so the model never does this sum. Every percentage it is
 * allowed to repeat is worked out here, which makes these numbers the ones
 * a user would challenge — so they are checked directly rather than through
 * the prompt that quotes them.
 */

import { describe, expect, it } from "vitest";

import { billTrend, describeTrend, type TrendBill } from "./billTrend.js";

/** Bills arrive newest first, as listBills returns them. */
const bills = (...kwh: number[]): TrendBill[] =>
  kwh.map((kwhUsed, i) => ({ kwhUsed, periodEnd: `2026-0${6 - i}-30` }));

describe("with a single bill", () => {
  it("reports no comparison at all", () => {
    const trend = billTrend(bills(312));

    expect(trend.billCount).toBe(1);
    expect(trend.vsPreviousPct).toBeNull();
    expect(trend.vsAveragePct).toBeNull();
    expect(trend.averageKwh).toBeNull();
  });

  it("tells the model in words that there is no history", () => {
    // Silence isn't enough: a model given nothing on the subject invents a
    // trend, so the absence has to be stated.
    const described = describeTrend(billTrend(bills(312)));

    expect(described).toMatch(/first bill on record/i);
    expect(described).toMatch(/do not describe any trend/i);
  });
});

describe("with a history", () => {
  it("compares against the previous bill", () => {
    // 300 -> 330 is +10%.
    expect(billTrend(bills(330, 300)).vsPreviousPct).toBe(10);
  });

  it("compares against the average of the earlier bills", () => {
    // Earlier bills average 200; 300 is 50% above that.
    expect(billTrend(bills(300, 100, 200, 300)).vsAveragePct).toBe(50);
    expect(billTrend(bills(300, 100, 200, 300)).averageKwh).toBe(200);
  });

  it("reports a fall as a negative change", () => {
    expect(billTrend(bills(240, 300)).vsPreviousPct).toBe(-20);
  });

  it("names the highest earlier month", () => {
    expect(billTrend(bills(300, 100, 450, 200)).highestKwh).toBe(450);
  });

  it("excludes the current bill from the average it is compared against", () => {
    // Including it would drag the average toward the very figure being
    // judged, and a spike would partly hide itself.
    expect(billTrend(bills(600, 200, 200)).averageKwh).toBe(200);
  });

  it("looks back no further than six bills", () => {
    // Beyond that the tariff and the business have usually both moved on.
    // Five earlier bills of 100, then older ones of 1000 that must not count.
    const history = bills(100, 100, 100, 100, 100, 100, 1000, 1000);

    expect(billTrend(history).averageKwh).toBe(100);
  });
});

describe("awkward numbers", () => {
  it("reports no change rather than dividing by zero", () => {
    // kwh_used may be 0: the schema allows it, and a vacant month is real.
    expect(billTrend(bills(120, 0)).vsPreviousPct).toBeNull();
  });

  it("says plainly when consumption is unchanged", () => {
    expect(describeTrend(billTrend(bills(300, 300)))).toMatch(/unchanged/i);
  });
});

describe("the summer caution", () => {
  it("always warns that March to May is cooling weather", () => {
    // Without it, a confident "usage is up 30%" reads as waste every April,
    // when for most people it is the weather.
    expect(describeTrend(billTrend(bills(400, 300)))).toMatch(/summer in the Philippines/i);
  });

  it("is left out when there is no trend to misread", () => {
    expect(describeTrend(billTrend(bills(312)))).not.toMatch(/summer/i);
  });
});

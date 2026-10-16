/**
 * Tests for the load estimate.
 *
 * These numbers reach the user as "your aircon is about 60% of your bill",
 * so they are the ones somebody will check against their own meter. The
 * cases that matter most are the honest ones: what happens when a figure is
 * missing, and what happens when the estimates don't agree with the bill.
 */

import { describe, expect, it } from "vitest";

import { applianceKwh, describeLoad, loadBreakdown } from "./loadEstimate.js";

/** A 1200W aircon at 70% duty, run 8 hours a day. */
const aircon = {
  type: "Air Conditioner",
  count: 1,
  hoursPerDay: 8,
  typicalWatts: 1200,
  dutyCycle: 0.7,
};

/** A fridge: on all day, but its compressor only runs a third of it. */
const fridge = {
  type: "Refrigerator",
  count: 1,
  hoursPerDay: 24,
  typicalWatts: 150,
  dutyCycle: 0.35,
};

describe("one appliance", () => {
  it("multiplies watts, duty, hours, count and days", () => {
    // 1200 x 0.7 x 8 x 1 x 30 / 1000 = 201.6
    expect(applianceKwh(aircon)).toBe(201.6);
  });

  it("counts every unit", () => {
    expect(applianceKwh({ ...aircon, count: 2 })).toBe(403.2);
  });

  it("applies the duty cycle rather than assuming continuous draw", () => {
    // 150 x 0.35 x 24 x 30 / 1000 = 37.8, not the 108 that nameplate x 24
    // would give. The fridge is the appliance people are most often told to
    // replace, so overstating it by 3x would misdirect real money.
    expect(applianceKwh(fridge)).toBe(37.8);
  });

  it("returns nothing when the hours were never asked", () => {
    // A default here would be a guess dressed as a calculation.
    expect(applianceKwh({ ...aircon, hoursPerDay: undefined })).toBeNull();
  });

  it("returns nothing when no wattage has been sourced", () => {
    expect(applianceKwh({ ...aircon, typicalWatts: undefined })).toBeNull();
  });

  it("reads 'never used' as zero rather than unknown", () => {
    expect(applianceKwh({ ...aircon, hoursPerDay: 0 })).toBe(0);
  });
});

describe("the whole survey", () => {
  it("ranks appliances by consumption, biggest first", () => {
    const { items } = loadBreakdown([fridge, aircon], 300);

    expect(items.map((i) => i.type)).toEqual(["Air Conditioner", "Refrigerator"]);
  });

  it("reports each one's share of the metered bill", () => {
    const { items } = loadBreakdown([aircon], 400);

    // 201.6 of 400 kWh.
    expect(items[0].sharePct).toBe(50);
  });

  it("reports how much of the bill it could account for", () => {
    const { coveragePct, accountedKwh } = loadBreakdown([aircon, fridge], 400);

    expect(accountedKwh).toBe(239.4);
    expect(coveragePct).toBe(60);
  });

  it("names what it couldn't estimate instead of dropping it", () => {
    // Silently omitting it would read as that appliance using nothing.
    const { unestimated, items } = loadBreakdown(
      [aircon, { ...fridge, hoursPerDay: undefined }],
      400,
    );

    expect(items).toHaveLength(1);
    expect(unestimated).toEqual(["Refrigerator"]);
  });

  it("survives a bill of zero kWh without dividing by it", () => {
    const { coveragePct, items } = loadBreakdown([aircon], 0);

    expect(coveragePct).toBe(0);
    expect(items[0].sharePct).toBe(0);
  });
});

describe("what the model is told", () => {
  it("states the coverage, not just the shares", () => {
    // Given only the shares, a model presents them as the whole picture.
    expect(describeLoad(loadBreakdown([aircon], 400))).toMatch(/account for about 50%/i);
  });

  it("says plainly when the estimates exceed the meter", () => {
    // An estimate claiming more than was metered means the hours or
    // wattages are wrong, and that is the only clue anyone gets.
    const described = describeLoad(loadBreakdown([aircon, fridge], 100));

    expect(described).toMatch(/MORE than/);
    expect(described).toMatch(/rough/i);
  });

  it("forbids guessing when nothing could be estimated", () => {
    const described = describeLoad(loadBreakdown([{ ...aircon, hoursPerDay: undefined }], 400));

    expect(described).toMatch(/do not estimate/i);
  });

  it("lists the appliances it had to leave out", () => {
    const described = describeLoad(
      loadBreakdown([aircon, { ...fridge, hoursPerDay: undefined }], 400),
    );

    expect(described).toMatch(/Not estimated.*Refrigerator/);
  });
});

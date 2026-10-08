import { describe, expect, it } from "vitest";
import { billStats, billTrend } from "./billStats";
import type { Bill } from "../../lib/api";

function bill(amount: number, kwhUsed: number, periodEnd: string | null): Bill {
  return {
    id: periodEnd ?? "none",
    establishmentId: "e1",
    providerId: null,
    kwhUsed,
    amount,
    periodStart: null,
    periodEnd,
    file: null,
    createdAt: "2026-07-20T03:00:00Z",
  };
}

// Newest first, as the API returns them.
const bills = [bill(18236, 312, "2026-09-01"), bill(16790, 290, "2026-08-15")];

describe("billStats", () => {
  it("describes the latest bill against the one before it", () => {
    expect(billStats(bills)).toEqual({
      amount: 18236,
      kwhUsed: 312,
      vsLastPercent: 8.6,
      costPerKwh: 58.45,
    });
  });

  it("has nothing to compare against with one bill or a ₱0 previous one", () => {
    expect(billStats(bills.slice(0, 1))?.vsLastPercent).toBeNull();
    expect(billStats([bills[0], bill(0, 0, null)])?.vsLastPercent).toBeNull();
  });

  it("has no cost per kWh for a 0 kWh bill", () => {
    expect(billStats([bill(500, 0, null)])?.costPerKwh).toBeNull();
  });

  it("is null without bills", () => {
    expect(billStats([])).toBeNull();
  });
});

describe("billTrend", () => {
  it("runs oldest first, labelled by period end, falling back to upload date", () => {
    expect(billTrend([...bills, bill(100, 10, null)])).toEqual([
      { month: "Jul", amount: 100 },
      { month: "Aug", amount: 16790 },
      { month: "Sep", amount: 18236 },
    ]);
  });
});

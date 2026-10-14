import { describe, expect, it } from "vitest";

import { toItems, totals } from "./savings";
import type { ReadyInsights } from "../insights/useInsights";
import type { ArchivedAction } from "../../lib/insights";

const BILL_ID = "bill-1";

function insights(archived: ArchivedAction[] = []): ReadyInsights {
  return {
    available: true,
    result: {
      accountName: "Cafe",
      healthScore: 60,
      healthLabel: "Fair",
      benchmark: { peerAverageKwh: 300, deltaPct: 10 },
      recommendations: [
        { id: "high-vs-peers", title: "High", description: "d", impact: "high", category: "benchmark" },
        { id: "no-estimate", title: "None", description: "d", impact: "low", category: "usage" },
      ],
    },
    benchmark: { source: "peers", cohortSize: 10 },
    basedOn: { billId: BILL_ID, periodStart: null, periodEnd: null, kwhUsed: 330, amount: 3960 },
    narrative: {
      status: "ready",
      summary: "s",
      ruleSavings: { "high-vs-peers": { kwh: 30, php: 360 } },
      actions: [
        { id: "ai-unplug", title: "Unplug", description: "d", impact: "low", savings: { kwh: 10, php: 120 } },
      ],
    },
    archived,
  };
}

const archivedAs = (actionId: string, billId = BILL_ID): ArchivedAction => ({
  billId,
  periodStart: null,
  periodEnd: null,
  actionId,
  status: "done",
  title: "t",
  description: "d",
  impact: "low",
  savings: null,
  createdAt: "2026-10-14T00:00:00Z",
});

describe("toItems", () => {
  it("lists rules and suggestions with savings, skipping zero estimates", () => {
    expect(toItems(insights()).map((i) => i.id)).toEqual(["high-vs-peers", "ai-unplug"]);
  });

  it("leaves out actions archived on this bill only", () => {
    const items = toItems(insights([archivedAs("ai-unplug"), archivedAs("high-vs-peers", "older-bill")]));
    expect(items.map((i) => i.id)).toEqual(["high-vs-peers"]);
  });

  it("is empty until the estimates arrive", () => {
    expect(toItems({ ...insights(), narrative: { status: "pending" } })).toEqual([]);
  });
});

describe("totals", () => {
  const bill = { amount: 3960, kwhUsed: 330 };

  it("adds up the selection and works out the share of the bill", () => {
    const t = totals(toItems(insights()), bill);
    expect(t).toEqual({ php: 480, kwh: 40, percent: (480 / 3960) * 100 });
  });

  it("never saves more than the whole bill", () => {
    expect(totals(toItems(insights()), { amount: 100, kwhUsed: 5 })).toEqual({
      php: 100,
      kwh: 5,
      percent: 100,
    });
  });

  it("reads an empty bill as no reduction", () => {
    expect(totals([], { amount: 0, kwhUsed: 0 }).percent).toBe(0);
  });
});

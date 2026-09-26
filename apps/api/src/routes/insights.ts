/**
 * Insights for one establishment.
 *
 *   GET /api/establishments/:establishmentId/insights
 *
 * This is the pipeline the recommendation engine was always missing: it
 * assembles an EnergyProfile from what the establishment has actually
 * recorded, runs the engine over it, and returns the score with enough
 * context for the UI to describe where the comparison came from.
 *
 * Mounted under the establishments router, so auth, the database guard and
 * the ownership check have already run.
 *
 * Nothing is stored. The result is derived from the bills and appliances on
 * every request, which keeps it correct after an edit and means there is no
 * cached score to invalidate. If that ever becomes expensive, a cache
 * belongs here rather than in the engine.
 */

import { Router } from "express";
import { getRecommendationEngine } from "../engine/index.js";
import { listAppliances } from "../store/applianceStore.js";
import { getPeerBenchmark } from "../store/benchmarkStore.js";
import { listBills } from "../store/billStore.js";
import { respondToStoreError, type StoreErrorMessages } from "./storeErrors.js";
import type { EnergyProfile } from "../types/recommendation.js";
import type { InsightsResponse } from "../types/insights.js";

export const insightsRouter = Router({ mergeParams: true });

/** How a database failure reads to someone looking at their dashboard. */
const ERRORS: StoreErrorMessages = {
  source: "insights",
  staleReference: "that establishment no longer exists",
  notPermitted: "Those insights aren't yours to read.",
};

/** GET — the establishment's current health score and recommendations. */
insightsRouter.get("/", async (req, res, next) => {
  const establishment = req.establishment!;
  const token = req.accessToken!;

  try {
    // Independent reads, so issue them together rather than in sequence.
    const [bills, appliances, benchmark] = await Promise.all([
      listBills(token, establishment.id),
      listAppliances(token, establishment.id),
      getPeerBenchmark(token, establishment.typeId),
    ]);

    // listBills is ordered newest period first, so the head is the current
    // statement — the one a score should describe.
    const latest = bills[0];
    if (!latest) {
      const empty: InsightsResponse = { available: false, reason: "NO_BILLS" };
      return res.json(empty);
    }

    const profile: EnergyProfile = {
      accountName: establishment.name,
      kwhUsed: latest.kwhUsed,
      amount: latest.amount,
      // Left off entirely when the cohort was too small to disclose: the
      // engine then applies its own published reference figure, so there is
      // no second copy of that constant here to drift out of step.
      ...(benchmark.peerAverageKwh !== null
        ? { peerAverageKwh: benchmark.peerAverageKwh }
        : {}),
      // Appliances carry the kind name and inverter flag already, resolved
      // by the store, so the engine's rules read them unchanged.
      appliances,
    };

    const result = await getRecommendationEngine().generate(profile);

    const body: InsightsResponse = {
      available: true,
      result,
      benchmark: {
        source: benchmark.peerAverageKwh !== null ? "peers" : "reference",
        cohortSize: benchmark.cohortSize,
      },
      basedOn: {
        billId: latest.id,
        periodStart: latest.periodStart,
        periodEnd: latest.periodEnd,
      },
    };
    return res.json(body);
  } catch (err) {
    return respondToStoreError(err, res, next, ERRORS);
  }
});

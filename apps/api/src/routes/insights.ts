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
import { billTrend, describeTrend } from "../engine/billTrend.js";
import { generateNarrative, type NarrativeInput } from "../engine/llmNarrative.js";
import {
  claimNarrative,
  failNarrative,
  getNarrative,
  profileFingerprint,
  saveNarrative,
} from "../store/narrativeStore.js";
import { listAppliances } from "../store/applianceStore.js";
import { getPeerBenchmark } from "../store/benchmarkStore.js";
import { listBills } from "../store/billStore.js";
import { respondToStoreError, type StoreErrorMessages } from "./storeErrors.js";
import type { EnergyProfile } from "../types/recommendation.js";
import type { InsightsResponse, NarrativeState } from "../types/insights.js";

export const insightsRouter = Router({ mergeParams: true });

/**
 * Start generating a narrative, without waiting for it.
 *
 * Deliberately not awaited: the score is already on its way to the client,
 * and a free endpoint can take tens of seconds or never answer at all.
 * Everything is caught in here, because an unhandled rejection in a
 * detached promise takes the whole process down in Node.
 */
function startGeneration(
  accessToken: string,
  billId: string,
  profileHash: string,
  input: NarrativeInput,
): void {
  void (async () => {
    try {
      const narrative = await generateNarrative(input);
      await saveNarrative(accessToken, billId, narrative, profileHash);
    } catch (err) {
      console.error(`[insights] narrative generation failed for bill ${billId}:`, err);
      try {
        // Recorded so the next page view doesn't immediately try again. The
        // usual cause is a rate limit, and retrying on every view keeps it
        // tripped.
        await failNarrative(accessToken, billId, profileHash);
      } catch (markErr) {
        console.error("[insights] could not mark the narrative failed:", markErr);
      }
    }
  })();
}

/**
 * The narrative for this bill: already written, being written, or started
 * now.
 *
 * Never throws. A narrative is an addition to an analysis the rules have
 * already completed, so a database or model problem here must cost the
 * prose and nothing else — failing the request would throw away a perfectly
 * good score because the decoration was unavailable.
 */
async function resolveNarrative(
  accessToken: string,
  billId: string,
  input: NarrativeInput,
): Promise<NarrativeState> {
  const profileHash = profileFingerprint(input);

  try {
    const existing = await getNarrative(accessToken, billId);

    // A row describing these exact figures is the answer, whatever state
    // it is in. A different fingerprint means the bill or the appliance
    // survey has changed since, and the prose has to be rewritten.
    if (existing && existing.profileHash === profileHash) {
      if (existing.status === "ready" && existing.summary) {
        return { status: "ready", summary: existing.summary, actions: existing.actions };
      }
      return { status: existing.status === "failed" ? "failed" : "pending" };
    }

    // Only the caller that wins the claim starts a model; a loser reports
    // pending and picks up the winner's result on a later request.
    if (await claimNarrative(accessToken, billId, profileHash, existing)) {
      startGeneration(accessToken, billId, profileHash, input);
    }
    return { status: "pending" };
  } catch (err) {
    console.error("[insights] could not resolve the narrative:", err);
    return { status: "failed" };
  }
}

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
    if (appliances.length === 0) {
      const empty: InsightsResponse = { available: false, reason: "NO_APPLIANCES" };
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
    const comparedWithPeers = benchmark.peerAverageKwh !== null;

    // The model is asked about the same figures the engine used, plus its
    // conclusions — never the establishment's name or address. See
    // engine/llmNarrative.ts for why that matters on a free endpoint.
    const narrativeInput: NarrativeInput = {
      // Falls back to a neutral word rather than leaving the model to guess
      // from the appliance list — it would assume a business.
      establishmentType: establishment.typeName ?? "establishment",
      // Reduced to sentences here so the model is never the thing doing the
      // arithmetic on a bill history.
      history: describeTrend(billTrend(bills)),
      kwhUsed: latest.kwhUsed,
      amount: latest.amount,
      peerAverageKwh: result.benchmark.peerAverageKwh,
      comparedWithPeers,
      deltaPct: result.benchmark.deltaPct,
      healthScore: result.healthScore,
      appliances: appliances.map((a) => ({
        type: a.type,
        count: a.count,
        isInverter: a.isInverter,
        ageYears: a.ageYears,
      })),
      findings: result.recommendations.map((r) => ({ title: r.title, impact: r.impact })),
    };

    const body: InsightsResponse = {
      available: true,
      result,
      benchmark: {
        source: comparedWithPeers ? "peers" : "reference",
        cohortSize: benchmark.cohortSize,
      },
      basedOn: {
        billId: latest.id,
        periodStart: latest.periodStart,
        periodEnd: latest.periodEnd,
        kwhUsed: latest.kwhUsed,
        amount: latest.amount,
      },
      narrative: await resolveNarrative(token, latest.id, narrativeInput),
    };
    return res.json(body);
  } catch (err) {
    return respondToStoreError(err, res, next, ERRORS);
  }
});

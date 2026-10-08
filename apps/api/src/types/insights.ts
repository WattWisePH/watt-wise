/**
 * The shape of an establishment's insights.
 *
 * This is the assembled answer behind the "Health Score" and "Priority
 * Actions" screens: the engine's output, plus enough context for the UI to
 * say honestly where the comparison came from.
 *
 * "No bills yet" is modelled as a successful response rather than an error.
 * A new establishment having nothing to analyse is the normal first state of
 * every account, and reporting it as a 404 would make the client treat an
 * expected empty screen as a failure.
 */

import type { RecommendationResult } from "./recommendation.js";

/** Where the peer average in the result came from. */
export interface BenchmarkContext {
  /**
   * "peers" when a real cohort was large enough to report, "reference" when
   * the engine fell back to a published average. The UI must not present
   * the second as a comparison against real establishments.
   */
  source: "peers" | "reference";
  /**
   * How many establishments were compared. Can be non-zero while source is
   * "reference": a cohort below the disclosure floor is counted but not
   * averaged.
   */
  cohortSize: number;
}

/**
 * Which bill the figures describe, and what it said.
 *
 * The engine's result reports the peer average and the percentage gap but
 * not the establishment's own consumption, so the readings are repeated
 * here — a comparison chart needs both ends of it, and recovering one from
 * a rounded percentage would disagree with the bill the user can see.
 */
export interface InsightsBasis {
  billId: string;
  periodStart: string | null;
  periodEnd: string | null;
  kwhUsed: number;
  amount: number;
}

export type InsightsResponse =
  | {
      available: false;
      /**
       * NO_BILLS: nothing has been uploaded yet. NO_APPLIANCES: there is a
       * bill but no survey, and without one the appliance rules have
       * nothing to read — the score would look complete while missing them.
       */
      reason: "NO_BILLS" | "NO_APPLIANCES";
    }
  | {
      available: true;
      result: RecommendationResult;
      benchmark: BenchmarkContext;
      basedOn: InsightsBasis;
    };

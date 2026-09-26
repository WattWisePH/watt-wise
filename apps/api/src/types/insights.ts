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

/** Which bill the figures describe. */
export interface InsightsBasis {
  billId: string;
  periodStart: string | null;
  periodEnd: string | null;
}

export type InsightsResponse =
  | {
      available: false;
      /** Nothing has been uploaded for this establishment yet. */
      reason: "NO_BILLS";
    }
  | {
      available: true;
      result: RecommendationResult;
      benchmark: BenchmarkContext;
      basedOn: InsightsBasis;
    };

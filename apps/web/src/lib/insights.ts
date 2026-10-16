/**
 * Insights client.
 *
 * One call returns everything the Health Score and Priority Actions screens
 * show: the engine's score and recommendations, which bill they describe,
 * and where the comparison figure came from.
 *
 * The route lives in apps/api/src/routes/insights.ts. These types mirror
 * apps/api/src/types/insights.ts — if one moves, move both.
 */

import { ApiError, apiUrl } from "./api";
import { authHeaders } from "./session";

/** How much impact acting on a recommendation is expected to have. */
export type ImpactLevel = "high" | "medium" | "low";

/** One prioritised recommendation, as shown in Priority Actions. */
export interface Recommendation {
  /** Stable slug, so a dismissal can be remembered against it later. */
  id: string;
  title: string;
  description: string;
  impact: ImpactLevel;
  /** "benchmark" | "usage" | "baseline" | "appliances". */
  category: string;
}

/** The engine's output for one establishment. */
export interface RecommendationResult {
  accountName: string;
  /** 0-100, higher is better. */
  healthScore: number;
  healthLabel: "Good" | "Fair" | "Poor";
  benchmark: {
    peerAverageKwh: number;
    /** Percent difference vs peers; +18 means 18% above average. */
    deltaPct: number;
  };
  recommendations: Recommendation[];
}

/** Where the peer average came from. */
export interface BenchmarkContext {
  /**
   * "peers" when a real cohort was large enough to disclose, "reference"
   * when the engine fell back to a published average.
   *
   * These must not be worded the same on screen. Calling a reference figure
   * a comparison against similar establishments would be a claim the data
   * doesn't support.
   */
  source: "peers" | "reference";
  /**
   * How many establishments were compared. Can be non-zero while source is
   * "reference": a cohort below the disclosure floor is counted, not shown.
   */
  cohortSize: number;
}

/** Which bill the figures describe, and what it said. */
export interface InsightsBasis {
  billId: string;
  periodStart: string | null;
  periodEnd: string | null;
  kwhUsed: number;
  amount: number;
}

/**
 * A suggestion written by the language model rather than derived from a
 * rule.
 *
 * Kept apart from Recommendation deliberately. A rule's finding is
 * traceable to the figures that produced it; this is a model's judgement
 * about those figures, and the screen has to let a reader tell which is
 * which before acting on it.
 */
export interface NarrativeAction {
  /** Stable, derived from the title; what a saved status is keyed on. */
  id: string;
  title: string;
  description: string;
  impact: ImpactLevel;
  savings: Savings;
}

/**
 * The model's monthly savings estimate for one action. The kWh is the
 * model's; the pesos are that kWh at the bill's own rate.
 */
export interface Savings {
  kwh: number;
  php: number;
}

/**
 * The model-written layer, which arrives after the score rather than with
 * it.
 *
 * "failed" is an ordinary outcome, not an error: the rules have already
 * produced the analysis, so a model being rate-limited costs the prose and
 * nothing else. The screen renders everything else exactly as it would.
 */
export type NarrativeState =
  | { status: "pending" }
  | { status: "failed" }
  | {
      status: "ready";
      summary: string;
      actions: NarrativeAction[];
      /** Estimates for the rule engine's recommendations, keyed by their id. */
      ruleSavings: Record<string, Savings>;
    };

/** What the user did with a priority action. */
export type ActionStatus = "done" | "dismissed";

/**
 * A priority action marked done or dismissed, as it read at the time.
 * Recorded per bill, so the same action can come back on a later one.
 */
export interface ArchivedAction {
  billId: string;
  periodStart: string | null;
  periodEnd: string | null;
  actionId: string;
  status: ActionStatus;
  title: string;
  description: string;
  impact: ImpactLevel;
  savings: Savings | null;
  createdAt: string;
}

export type Insights =
  | { available: false; reason: "NO_BILLS" | "NO_APPLIANCES" }
  | {
      available: true;
      result: RecommendationResult;
      benchmark: BenchmarkContext;
      basedOn: InsightsBasis;
      narrative: NarrativeState;
      /** Every action marked done or dismissed, across all bills, newest first. */
      archived: ArchivedAction[];
    };

/** "18% above" / "4% below" / "in line with", from the signed percentage. */
export function gapPhrase(deltaPct: number): string {
  if (deltaPct === 0) return "in line with";
  return `${Math.abs(deltaPct)}% ${deltaPct > 0 ? "above" : "below"}`;
}

/**
 * The one-line reading under the health score gauge. Shared by the
 * dashboard and the Health Score tab so the two can't describe the same
 * score differently.
 */
export function scoreInsight(
  result: RecommendationResult,
  benchmark: BenchmarkContext,
): string {
  return benchmark.source === "peers"
    ? `${gapPhrase(result.benchmark.deltaPct)} the average of ${benchmark.cohortSize} similar establishments`
    : "Compared against a reference average, not enough similar establishments yet";
}

/**
 * Fetch one establishment's insights.
 *
 * An establishment with no bills yet comes back as a successful response
 * with `available: false`, not an error — it is the normal state of a new
 * account, and the caller shows an empty screen rather than a failure.
 */
export async function getInsights(establishmentId: string): Promise<Insights> {
  const res = await fetch(
    apiUrl(`/api/establishments/${establishmentId}/insights`),
    { headers: await authHeaders() },
  );
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      data.message ?? data.error ?? "Failed to load your insights",
      res.status,
      data.details,
    );
  }
  return data as Insights;
}

/** Ids of the actions already marked done or dismissed on this bill. */
export function archivedIds(archived: ArchivedAction[], billId: string): Set<string> {
  return new Set(archived.filter((a) => a.billId === billId).map((a) => a.actionId));
}

/** The URL for one action's status on one bill. */
function actionUrl(establishmentId: string, billId: string, actionId: string): string {
  return apiUrl(
    `/api/establishments/${establishmentId}/actions/${billId}/${encodeURIComponent(actionId)}`,
  );
}

/** Throw an ApiError for a failed status write, with the server's wording. */
async function ensureOk(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  const data = await res.json().catch(() => ({}));
  throw new ApiError(data.message ?? data.error ?? fallback, res.status, data.details);
}

/** Mark an action done or dismissed, saving the card as it reads now. */
export async function setActionStatus(
  establishmentId: string,
  action: Omit<ArchivedAction, "periodStart" | "periodEnd" | "createdAt">,
): Promise<void> {
  const { billId, actionId, ...body } = action;
  const res = await fetch(actionUrl(establishmentId, billId, actionId), {
    method: "PUT",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await ensureOk(res, "Couldn't save that action");
}

/** Put an archived action back into Priority Actions. */
export async function clearActionStatus(
  establishmentId: string,
  billId: string,
  actionId: string,
): Promise<void> {
  const res = await fetch(actionUrl(establishmentId, billId, actionId), {
    method: "DELETE",
    headers: await authHeaders(),
  });
  await ensureOk(res, "Couldn't restore that action");
}

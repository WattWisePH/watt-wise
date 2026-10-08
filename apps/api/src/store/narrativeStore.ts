/**
 * Storage for the LLM-written part of an insight.
 *
 * One row per bill, fingerprinted by the figures it describes. The
 * fingerprint is what keeps the prose honest: a bill is not the only input,
 * so a narrative keyed on the bill alone would go on describing appliances
 * the user has since corrected.
 *
 * Claiming is the other job here. Generation runs in the background, and
 * two page loads arriving together would otherwise both start a model —
 * wasteful anywhere, and on a rate-limited free tier it is how both
 * requests end up failing. The insert acts as the lock: the primary key
 * means only the first caller gets the row.
 */

import { createHash } from "node:crypto";
import { DatabaseError, userClient } from "./supabaseClient.js";
import type { NarrativeAction } from "../engine/llmNarrative.js";

export type NarrativeStatus = "pending" | "ready" | "failed";

export interface StoredNarrative {
  status: NarrativeStatus;
  summary: string | null;
  actions: NarrativeAction[];
  profileHash: string;
}

/** The row shape Postgres returns. */
interface NarrativeRow {
  status: NarrativeStatus;
  summary: string | null;
  actions: NarrativeAction[] | null;
  profile_hash: string;
}

const NARRATIVE_COLUMNS = "status, summary, actions, profile_hash";

/**
 * Fingerprint the inputs a narrative was written about.
 *
 * Everything the prompt sees goes in, and nothing else: change what the
 * model is told and the text must be rewritten, change anything it never
 * saw and it must not be. Appliances are sorted, because the survey returns
 * them newest-first and re-saving an unchanged survey would otherwise
 * reorder the list and look like new information.
 */
export function profileFingerprint(input: {
  kwhUsed: number;
  amount: number;
  peerAverageKwh: number;
  comparedWithPeers: boolean;
  appliances: { type: string; count: number; isInverter?: boolean; ageYears?: number }[];
}): string {
  const appliances = input.appliances
    .map((a) => `${a.type}|${a.count}|${a.isInverter ?? ""}|${a.ageYears ?? ""}`)
    .sort()
    .join(";");

  return createHash("sha256")
    .update(
      [
        input.kwhUsed,
        input.amount,
        input.peerAverageKwh,
        input.comparedWithPeers,
        appliances,
      ].join("::"),
    )
    .digest("hex");
}

/** The stored narrative for a bill, or null when none has been written. */
export async function getNarrative(
  accessToken: string,
  billId: string,
): Promise<StoredNarrative | null> {
  const { data, error } = await userClient(accessToken)
    .from("bill_insights")
    .select(NARRATIVE_COLUMNS)
    .eq("bill_id", billId)
    .maybeSingle();

  if (error) throw new DatabaseError(error.message);
  if (!data) return null;

  const row = data as NarrativeRow;
  return {
    status: row.status,
    summary: row.summary,
    actions: row.actions ?? [],
    profileHash: row.profile_hash,
  };
}

/** Postgres unique violation — someone else inserted the row first. */
const UNIQUE_VIOLATION = "23505";

/**
 * Claim the right to generate a narrative for this bill.
 *
 * Returns true when this caller may proceed. A loser gets false and simply
 * reports the work as pending; the winner's result will be there on a later
 * request.
 *
 * Both paths are compare-and-swap rather than a blind write, because two
 * page loads can arrive together. Inserting relies on the primary key —
 * the second insert raises a unique violation, which is the lock doing its
 * job rather than an error. Taking over a stale row is conditional on the
 * fingerprint the caller actually saw, so a request working from an
 * out-of-date read can't reset a newer narrative back to pending.
 */
export async function claimNarrative(
  accessToken: string,
  billId: string,
  profileHash: string,
  existing: StoredNarrative | null,
): Promise<boolean> {
  const client = userClient(accessToken);
  const fresh = {
    status: "pending" as const,
    profile_hash: profileHash,
    summary: null,
    actions: [],
    model: null,
    updated_at: new Date().toISOString(),
  };

  if (!existing) {
    const { data, error } = await client
      .from("bill_insights")
      .insert({ bill_id: billId, ...fresh })
      .select("bill_id");

    if (error) {
      if (error.code === UNIQUE_VIOLATION) return false;
      throw new DatabaseError(error.message);
    }
    return (data ?? []).length > 0;
  }

  const { data, error } = await client
    .from("bill_insights")
    .update(fresh)
    .eq("bill_id", billId)
    .eq("profile_hash", existing.profileHash)
    .select("bill_id");

  if (error) throw new DatabaseError(error.message);
  return (data ?? []).length > 0;
}

/** Record a finished narrative. */
export async function saveNarrative(
  accessToken: string,
  billId: string,
  narrative: { summary: string; actions: NarrativeAction[]; model: string },
  profileHash: string,
): Promise<void> {
  const { error } = await userClient(accessToken)
    .from("bill_insights")
    .update({
      status: "ready",
      summary: narrative.summary,
      actions: narrative.actions,
      model: narrative.model,
      updated_at: new Date().toISOString(),
    })
    .eq("bill_id", billId)
    // Only if the figures haven't moved on while the model was thinking.
    // Otherwise a slow reply would overwrite a newer request's claim with
    // prose about last month's numbers.
    .eq("profile_hash", profileHash);

  if (error) throw new DatabaseError(error.message);
}

/**
 * Record that generation failed, so the next request doesn't immediately
 * try again — the usual cause is a rate limit, and retrying on every page
 * view would keep it tripped.
 */
export async function failNarrative(
  accessToken: string,
  billId: string,
  profileHash: string,
): Promise<void> {
  const { error } = await userClient(accessToken)
    .from("bill_insights")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("bill_id", billId)
    .eq("profile_hash", profileHash);

  if (error) throw new DatabaseError(error.message);
}

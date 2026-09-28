/**
 * Peer benchmarking.
 *
 * Unlike the other stores this calls a database function rather than
 * querying a table, and for a specific reason: the comparison needs rows
 * belonging to other accounts, which RLS hides. public.peer_benchmark is
 * `security definer`, so it can see them and return only an aggregate —
 * see supabase/migrations/20260926000100_peer_benchmark.sql for the guards
 * that make that safe.
 *
 * The call still goes through the caller's own client. The function decides
 * what it will disclose; the token is what proves someone is signed in at
 * all, and what auth.uid() reads to exclude the caller's own establishments
 * from their own benchmark.
 */

import { DatabaseError, userClient } from "./supabaseClient.js";

export interface PeerBenchmark {
  /**
   * Average monthly kWh across comparable establishments, or null when too
   * few contributed to report one without exposing an individual. A null
   * here is an ordinary outcome, not a failure — early in a deployment it
   * is the *expected* one.
   */
  peerAverageKwh: number | null;
  /** How many establishments were compared. Shown to explain the figure. */
  cohortSize: number;
}

/** The row shape the function returns, before mapping to camelCase. */
interface BenchmarkRow {
  peer_average_kwh: number | string | null;
  cohort_size: number;
}

/**
 * The benchmark for one establishment type.
 *
 * Returns a zero cohort rather than throwing when the function reports
 * nothing at all, since "no peers yet" is a normal state for a new
 * deployment and the caller handles it the same way as a withheld average.
 */
export async function getPeerBenchmark(
  accessToken: string,
  typeId: string,
): Promise<PeerBenchmark> {
  const { data, error } = await userClient(accessToken).rpc("peer_benchmark", {
    p_type_id: typeId,
  });

  if (error) throw new DatabaseError(error.message);

  // A `returns table` function arrives as an array of rows, even though
  // this one always yields exactly one.
  const row = (Array.isArray(data) ? data[0] : data) as BenchmarkRow | undefined;
  if (!row) return { peerAverageKwh: null, cohortSize: 0 };

  return {
    // numeric arrives as a JSON number, but coerce for the same reason the
    // bill store does: a string would propagate into the engine's
    // arithmetic and produce a plausible-looking wrong answer.
    peerAverageKwh: row.peer_average_kwh === null ? null : Number(row.peer_average_kwh),
    cohortSize: Number(row.cohort_size) || 0,
  };
}

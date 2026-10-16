/**
 * Storage for what the user did with a priority action: done or dismissed.
 *
 * One row per bill and action. Ownership is enforced by RLS through the
 * bill, so these only ever see the caller's own rows.
 */

import { DatabaseError, userClient } from "./supabaseClient.js";
import type { ActionStatus, ArchivedAction, Savings } from "../types/insights.js";
import type { ImpactLevel } from "../types/recommendation.js";

/** What is saved alongside a status, so the archive outlives the narrative. */
export interface ActionStatusInput {
  status: ActionStatus;
  title: string;
  description: string;
  impact: ImpactLevel;
  savings: Savings | null;
}

interface ActionStatusRow {
  bill_id: string;
  action_id: string;
  status: ActionStatus;
  title: string;
  description: string;
  impact: ImpactLevel;
  savings: Savings | null;
  created_at: string;
  bills: { period_start: string | null; period_end: string | null };
}

/** Every status recorded against this establishment's bills, newest first. */
export async function listActionStatuses(
  accessToken: string,
  establishmentId: string,
): Promise<ArchivedAction[]> {
  const { data, error } = await userClient(accessToken)
    .from("action_statuses")
    .select(
      "bill_id, action_id, status, title, description, impact, savings, created_at, bills!inner(establishment_id, period_start, period_end)",
    )
    .eq("bills.establishment_id", establishmentId)
    .order("created_at", { ascending: false });

  if (error) throw new DatabaseError(error.message);

  return ((data ?? []) as unknown as ActionStatusRow[]).map((row) => ({
    billId: row.bill_id,
    periodStart: row.bills.period_start,
    periodEnd: row.bills.period_end,
    actionId: row.action_id,
    status: row.status,
    title: row.title,
    description: row.description,
    impact: row.impact,
    savings: row.savings,
    createdAt: row.created_at,
  }));
}

/** Record a status, replacing any earlier one for the same action and bill. */
export async function setActionStatus(
  accessToken: string,
  billId: string,
  actionId: string,
  input: ActionStatusInput,
): Promise<void> {
  const { error } = await userClient(accessToken)
    .from("action_statuses")
    .upsert({
      bill_id: billId,
      action_id: actionId,
      ...input,
      created_at: new Date().toISOString(),
    });

  if (error) throw new DatabaseError(error.message);
}

/** Restore an action. False when there was nothing to remove. */
export async function clearActionStatus(
  accessToken: string,
  billId: string,
  actionId: string,
): Promise<boolean> {
  const { data, error } = await userClient(accessToken)
    .from("action_statuses")
    .delete()
    .eq("bill_id", billId)
    .eq("action_id", actionId)
    // Without a select, a delete that matched nothing looks like one that did.
    .select("action_id");

  if (error) throw new DatabaseError(error.message);
  return (data ?? []).length > 0;
}

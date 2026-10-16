/**
 * What the user did with a priority action.
 *
 *   PUT    /api/establishments/:establishmentId/actions/:billId/:actionId  Mark done or dismissed.
 *   DELETE /api/establishments/:establishmentId/actions/:billId/:actionId  Restore it.
 *
 * The list itself comes back with the insights, which already read
 * everything else these screens need. Mounted under the establishments
 * router, so auth, the database guard and the ownership check have run.
 */

import { Router } from "express";
import { isUuid } from "../lib/uuid.js";
import {
  clearActionStatus,
  setActionStatus,
  type ActionStatusInput,
} from "../store/actionStatusStore.js";
import { respondToStoreError, type StoreErrorMessages } from "./storeErrors.js";

export const actionsRouter = Router({ mergeParams: true });

const ERRORS: StoreErrorMessages = {
  source: "actions",
  staleReference: "that bill no longer exists",
  notPermitted: "That bill isn't yours to update.",
};

const STATUSES = ["done", "dismissed"];
const IMPACTS = ["high", "medium", "low"];

/** Validate the body: the status, plus the card as it read when acted on. */
function parseActionStatus(
  body: Record<string, unknown>,
): { input?: ActionStatusInput; errors: string[] } {
  const errors: string[] = [];

  const status = String(body.status ?? "");
  if (!STATUSES.includes(status)) errors.push("status must be done or dismissed");

  const title = String(body.title ?? "").trim();
  if (!title) errors.push("title is required");

  const description = String(body.description ?? "").trim();
  if (!description) errors.push("description is required");

  const impact = String(body.impact ?? "");
  if (!IMPACTS.includes(impact)) errors.push("impact must be high, medium or low");

  // Optional: a rule the model gave no estimate for has none to save.
  let savings: ActionStatusInput["savings"] = null;
  if (body.savings !== undefined && body.savings !== null) {
    const s = body.savings as Record<string, unknown>;
    const kwh = Number(s.kwh);
    const php = Number(s.php);
    if (!Number.isFinite(kwh) || kwh < 0 || !Number.isFinite(php) || php < 0) {
      errors.push("savings must have non-negative kwh and php");
    } else {
      savings = { kwh, php };
    }
  }

  if (errors.length > 0) return { errors };
  return {
    input: {
      status: status as ActionStatusInput["status"],
      title,
      description,
      impact: impact as ActionStatusInput["impact"],
      savings,
    },
    errors: [],
  };
}

/** PUT — mark an action done or dismissed for one bill. */
actionsRouter.put("/:billId/:actionId", async (req, res, next) => {
  const { billId, actionId } = req.params;
  // A malformed id would make Postgres raise rather than match no rows.
  if (!isUuid(billId)) return res.status(404).json({ error: "BILL_NOT_FOUND" });

  const { input, errors } = parseActionStatus(req.body ?? {});
  if (!input) return res.status(400).json({ error: "VALIDATION_FAILED", details: errors });

  try {
    await setActionStatus(req.accessToken!, billId, actionId, input);
    return res.status(204).end();
  } catch (err) {
    return respondToStoreError(err, res, next, ERRORS);
  }
});

/** DELETE — restore an action to Priority Actions, or 404. */
actionsRouter.delete("/:billId/:actionId", async (req, res, next) => {
  const { billId, actionId } = req.params;
  if (!isUuid(billId)) return res.status(404).json({ error: "ACTION_NOT_FOUND" });

  try {
    const removed = await clearActionStatus(req.accessToken!, billId, actionId);
    if (!removed) return res.status(404).json({ error: "ACTION_NOT_FOUND" });
    return res.status(204).end();
  } catch (err) {
    return respondToStoreError(err, res, next, ERRORS);
  }
});

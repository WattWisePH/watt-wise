/**
 * Loading the active establishment's bills for the dashboard.
 *
 * Same shape as useInsights: the result is stored against the id it was
 * fetched for, so switching establishments reads as loading again and a
 * slow response for the previous one is never shown under the new name.
 */

import { useEffect, useState } from "react";

import { listBills, type Bill } from "../../lib/api";
import { useEstablishment } from "../establishment/hooks/useEstablishment";

export type BillsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; bills: Bill[] };

type Settled = Exclude<BillsState, { status: "loading" }>;

export function useBills(): BillsState {
  const { activeEstablishmentId } = useEstablishment();
  const [settled, setSettled] = useState<{ id: string; state: Settled } | null>(null);

  useEffect(() => {
    if (!activeEstablishmentId) return;
    let active = true;

    listBills(activeEstablishmentId)
      .then((bills) => {
        if (active) setSettled({ id: activeEstablishmentId, state: { status: "ready", bills } });
      })
      .catch(() => {
        if (active) setSettled({ id: activeEstablishmentId, state: { status: "error" } });
      });

    return () => {
      active = false;
    };
  }, [activeEstablishmentId]);

  // No establishment means nothing recorded yet, not a failure.
  if (!activeEstablishmentId) return { status: "ready", bills: [] };
  if (settled?.id !== activeEstablishmentId) return { status: "loading" };
  return settled.state;
}

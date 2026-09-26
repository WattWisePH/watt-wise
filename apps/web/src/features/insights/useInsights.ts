/**
 * Loading the active establishment's insights.
 *
 * Fetched once by InsightsPage and handed to the tab screens through the
 * router outlet, rather than fetched by each of them: Health Score and
 * Priority Actions are two views of one analysis, and fetching per tab
 * would re-run the whole pipeline every time someone switched.
 */

import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";

import { ApiError } from "../../lib/api";
import { getInsights, type Insights } from "../../lib/insights";
import { useEstablishment } from "../establishment/hooks/useEstablishment";

/** The insights, once there is something to show. */
export type ReadyInsights = Extract<Insights, { available: true }>;

/**
 * Every state the screen can be in. Modelled explicitly so the page renders
 * one of them deliberately — "no establishment yet", "no bills yet" and "the
 * request failed" all look like empty data otherwise, and telling a user
 * their cafe is doing badly because nothing loaded would be worse than
 * showing nothing.
 */
export type InsightsState =
  | { status: "loading" }
  | { status: "no-establishment" }
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "ready"; insights: ReadyInsights };

/** A settled result, remembered against the establishment it describes. */
type Settled = Exclude<InsightsState, { status: "loading" | "no-establishment" }>;

/** Load insights for whichever establishment is currently selected. */
export function useInsights(): InsightsState {
  const { activeEstablishmentId } = useEstablishment();
  const [settled, setSettled] = useState<{ id: string; state: Settled } | null>(null);

  useEffect(() => {
    if (!activeEstablishmentId) return;

    // Guards against a slow response for the previous establishment
    // arriving after the user has switched to another one.
    let active = true;

    getInsights(activeEstablishmentId)
      .then((insights) => {
        if (!active) return;
        setSettled({
          id: activeEstablishmentId,
          state: insights.available
            ? { status: "ready", insights }
            : { status: "empty" },
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setSettled({
          id: activeEstablishmentId,
          state: {
            status: "error",
            message:
              err instanceof ApiError
                ? err.message
                : "Couldn't load your insights. Is the API running on :4000?",
          },
        });
      });

    return () => {
      active = false;
    };
  }, [activeEstablishmentId]);

  // Derived during render rather than written from the effect. Storing the
  // result against its establishment id is what makes that possible: on a
  // switch, the id no longer matches and this reads as loading again
  // without anything having to reset it — and last request's answer can
  // never be shown against this establishment's name.
  if (!activeEstablishmentId) return { status: "no-establishment" };
  if (settled?.id !== activeEstablishmentId) return { status: "loading" };
  return settled.state;
}

/**
 * The insights, read by a tab screen from the outlet.
 *
 * Safe to assume present: InsightsPage renders the outlet only once the
 * data is ready, and shows its own message in every other state.
 */
export function useInsightsData(): ReadyInsights {
  return useOutletContext<ReadyInsights>();
}

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
  | { status: "no-appliances" }
  | { status: "error"; message: string }
  | { status: "ready"; insights: ReadyInsights };

/**
 * What to show when there is no analysis to show.
 *
 * Each state gets its own wording. They all look like "no data" on screen
 * otherwise, and the user's next step differs completely between them —
 * set up an establishment, upload a bill, or check the API is running.
 */
export function message(
  state: Exclude<InsightsState, { status: "ready" }>,
): string {
  switch (state.status) {
    case "loading":
      return "Working out your energy health score…";
    case "no-establishment":
      return "Set up an establishment first — your insights are calculated per location.";
    case "empty":
      return "No bills yet. Upload one and your score will appear here.";
    case "no-appliances":
      return "One more step: tell us what appliances you use, and your score will appear here.";
    case "error":
      return state.message;
  }
}

/**
 * Where to send someone who can't be shown a score yet.
 *
 * Two of these states are reachable straight after finishing the appliance
 * survey, which routes to Insights on save. Without a way onward that would
 * be a dead end on the screen meant to be the payoff.
 */
export const NEXT_STEP: Partial<
  Record<InsightsState["status"], { to: string; label: string }>
> = {
  "no-establishment": { to: "/establishment", label: "Set up an establishment" },
  empty: { to: "/upload", label: "Upload a bill" },
  "no-appliances": { to: "/appliances", label: "Add your appliances" },
};

/** A settled result, remembered against the establishment it describes. */
type Settled = Exclude<InsightsState, { status: "loading" | "no-establishment" }>;

/** How long to wait before asking again for a narrative still being written. */
const POLL_MS = 6000;

/**
 * How many times to ask. The model is on a rate-limited free tier, so a
 * narrative that hasn't arrived after this long probably isn't coming —
 * and polling forever would keep a tab making requests all day. The score
 * is already on screen either way.
 */
const MAX_POLLS = 5;

/** Load insights for whichever establishment is currently selected. */
export function useInsights(): InsightsState {
  const { activeEstablishmentId } = useEstablishment();
  const [settled, setSettled] = useState<{ id: string; state: Settled } | null>(null);
  // Counted per establishment, so switching to another one starts its own
  // budget rather than inheriting an exhausted count.
  const [polls, setPolls] = useState<{ id: string; count: number }>({ id: "", count: 0 });

  const pollCount = polls.id === activeEstablishmentId ? polls.count : 0;

  useEffect(() => {
    if (!activeEstablishmentId) return;

    // Guards against a slow response for the previous establishment
    // arriving after the user has switched to another one.
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    getInsights(activeEstablishmentId)
      .then((insights) => {
        if (!active) return;
        setSettled({
          id: activeEstablishmentId,
          state: insights.available
            ? { status: "ready", insights }
            : insights.reason === "NO_APPLIANCES"
              ? { status: "no-appliances" }
              : { status: "empty" },
        });

        // The narrative is written in the background, so ask again shortly
        // rather than leaving "writing…" on screen forever. Scheduled from
        // the callback, never synchronously in the effect body.
        if (
          insights.available &&
          insights.narrative.status === "pending" &&
          pollCount < MAX_POLLS
        ) {
          timer = setTimeout(() => {
            setPolls({ id: activeEstablishmentId, count: pollCount + 1 });
          }, POLL_MS);
        }
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
      if (timer) clearTimeout(timer);
    };
  }, [activeEstablishmentId, pollCount]);

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

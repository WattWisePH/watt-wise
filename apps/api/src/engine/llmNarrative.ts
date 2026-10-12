/**
 * The language-model layer on top of the rule engine.
 *
 * It does not score anything and it does not replace a rule. The rules
 * decide every number — the health score, the peer gap, which findings
 * apply — and this takes those conclusions and writes them up, adding
 * suggestions it can justify from the same figures.
 *
 * That split is deliberate. A score that returns 72 one day and 68 the next
 * for identical inputs is not a product, and energy advice that cannot be
 * traced back to a rule cannot be defended to the person acting on it.
 *
 * PRIVACY: the prompt is de-identified on purpose. Free OpenRouter
 * endpoints may log prompts for provider training, so nothing that names a
 * customer goes into one — no establishment name, no address, no account
 * number. Consumption figures and appliance kinds are all the model needs
 * to write useful advice, and they identify nobody. Keep it that way even
 * after moving to a paid endpoint.
 */

import type { ImpactLevel, Recommendation } from "../types/recommendation.js";
import type { NarrativeAction } from "../types/insights.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Models to try, in order. Same names the OCR path uses: they are the ones
 * verified to work on this account's key, and a free endpoint that has been
 * seen answering is worth more than a better-sounding one that might not be
 * reachable. NARRATIVE_MODEL overrides the first entry.
 */
const DEFAULT_MODELS = [
  "dots-studio/dots-3-note-preview:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "google/gemma-4-31b-it:free",
];

/** OpenRouter rejects a `models` array longer than this with a 400. */
const MAX_MODELS = 3;

/** Stop a slow free endpoint from holding a background task open forever. */
const TIMEOUT_MS = 30_000;

/** At most this many model-authored actions reach the user. */
const MAX_ACTIONS = 3;

/** What the model is given: figures and findings, never an identity. */
export interface NarrativeInput {
  /**
   * The kind of place — "Cafe", "Household". Not identifying, and advice
   * depends on it: a household has no opening hours to stagger and no
   * customers to keep comfortable.
   */
  establishmentType: string;
  /**
   * The bill history, already reduced to sentences. Deliberately not the
   * raw bills: handing those over would leave the model doing the
   * arithmetic, and a percentage it worked out itself is a number no rule
   * produced and nobody can check.
   */
  history: string;
  kwhUsed: number;
  amount: number;
  /** Peer average when one could be disclosed, else the reference figure. */
  peerAverageKwh: number;
  /** Whether that average came from real peers. Changes what may be claimed. */
  comparedWithPeers: boolean;
  deltaPct: number;
  healthScore: number;
  appliances: {
    type: string;
    count: number;
    isInverter?: boolean;
    ageYears?: number;
  }[];
  /** The rule engine's findings, so the model elaborates rather than repeats. */
  findings: Pick<Recommendation, "title" | "impact">[];
}

export type { NarrativeAction };

export interface Narrative {
  summary: string;
  actions: NarrativeAction[];
  /** Which model answered, for when old wording looks wrong later. */
  model: string;
}

/** Build the instruction. Strict, so the reply is parseable. */
function buildPrompt(input: NarrativeInput): string {
  const appliances = input.appliances.length
    ? input.appliances
        .map((a) => {
          const parts = [`${a.count}x ${a.type}`];
          if (a.isInverter === true) parts.push("inverter");
          if (a.isInverter === false) parts.push("non-inverter");
          if (a.ageYears !== undefined) parts.push(`${a.ageYears} years old`);
          return parts.join(", ");
        })
        .join("; ")
    : "none recorded";

  const findings = input.findings.length
    ? input.findings.map((f) => `- ${f.title} (${f.impact} impact)`).join("\n")
    : "- none; usage looks healthy";

  // The comparison is described in words rather than handed over as a flag,
  // so the model cannot claim a peer comparison that never happened.
  const comparison = input.comparedWithPeers
    ? `${Math.abs(input.deltaPct)}% ${input.deltaPct >= 0 ? "above" : "below"} the average of similar establishments (${input.peerAverageKwh} kWh)`
    : `${Math.abs(input.deltaPct)}% ${input.deltaPct >= 0 ? "above" : "below"} a published reference average (${input.peerAverageKwh} kWh). There are too few similar establishments to compare against real ones, so do NOT claim a comparison with other businesses.`;

  // A household is not a business. Advising a family on their opening
  // hours is the kind of thing that makes everything else sound unreliable.
  const isHousehold = /household|home|residential/i.test(input.establishmentType);
  const audience = isHousehold
    ? "a Philippine household"
    : `a Philippine ${input.establishmentType.toLowerCase()}`;

  return `You are an energy efficiency adviser for ${audience}.

Here is their most recent month of data:
- Electricity used: ${input.kwhUsed} kWh
- Amount billed: PHP ${input.amount}
- Comparison: ${comparison}
- Energy health score: ${input.healthScore} out of 100
- Appliances: ${appliances}

History: ${input.history}

An analysis has already produced these findings:
${findings}

Write a short plain-language summary of the situation, then suggest up to ${MAX_ACTIONS} ADDITIONAL practical actions that the findings above do NOT already cover.

Rules you must follow:
- Use ONLY the figures given above. Never state a number that is not listed here, and never estimate your own — no invented peso savings, no invented percentages.
- Do not repeat the findings listed above; add angles they miss.
- Write for ${isHousehold ? "a homeowner" : "a small business owner"}, not an engineer. Two or three sentences for the summary.
- Only describe a trend if the History section states one. Never work out a percentage or a peso figure yourself.
- If there is nothing useful to add, return an empty actions array.

Reply with ONLY a JSON object, no markdown and no prose around it:
{"summary": string, "actions": [{"title": string, "description": string, "impact": "high"|"medium"|"low"}]}`;
}

/** Pull the first JSON object out of a reply that may be fenced or chatty. */
function extractJson(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Accept an impact only if the model used one of the three levels. */
function toImpact(value: unknown): ImpactLevel {
  return value === "high" || value === "low" ? value : "medium";
}

/**
 * Turn a raw model reply into a Narrative. Pure, and exported, so it can be
 * tested against the malformed replies free models actually produce —
 * which is where the bugs are, not in the network call.
 */
export function parseNarrativeReply(rawText: string, model: string): Narrative | null {
  const parsed = extractJson(rawText);
  if (!parsed) return null;

  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  if (!summary) return null;

  const actions = Array.isArray(parsed.actions)
    ? parsed.actions
        .filter((a): a is Record<string, unknown> => typeof a === "object" && a !== null)
        .map((a) => ({
          title: typeof a.title === "string" ? a.title.trim() : "",
          description: typeof a.description === "string" ? a.description.trim() : "",
          impact: toImpact(a.impact),
        }))
        // A suggestion with no title or no explanation is not actionable, and
        // rendering a blank card would look like a broken screen.
        .filter((a) => a.title && a.description)
        .slice(0, MAX_ACTIONS)
    : [];

  return { summary, actions, model };
}

/**
 * Ask a model to write up an analysis.
 *
 * Throws on any failure — no key, no answer, unparseable reply. The caller
 * records that as a failed narrative and shows the score without prose,
 * because losing the writing is not losing the feature.
 */
export async function generateNarrative(input: NarrativeInput): Promise<Narrative> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const configured = process.env.NARRATIVE_MODEL;
  const models = (
    configured
      ? [configured, ...DEFAULT_MODELS.filter((m) => m !== configured)]
      : DEFAULT_MODELS
  ).slice(0, MAX_MODELS);

  // A free endpoint can hang. Without this the background task would stay
  // open indefinitely and the row would never leave 'pending'.
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "WattWise",
    },
    body: JSON.stringify({
      models,
      messages: [{ role: "user", content: buildPrompt(input) }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenRouter narrative failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const body = (await res.json()) as {
    model?: string;
    choices?: { message?: { content?: string } }[];
  };
  const rawText = body.choices?.[0]?.message?.content ?? "";
  const narrative = parseNarrativeReply(rawText, body.model ?? models[0]);

  // A 200 carrying something unparseable is the failure mode free routers
  // actually produce, and it must not be stored as a successful narrative.
  if (!narrative) {
    throw new Error(`OpenRouter narrative was unparseable: ${rawText.slice(0, 300)}`);
  }
  return narrative;
}

/**
 * Tests for reading a model's reply.
 *
 * The network call isn't the interesting part — the reply is. Free models
 * wrap JSON in markdown fences, chat around it, invent impact levels, and
 * return half-filled objects, and all of that arrives as a perfectly
 * successful HTTP 200. Everything here is a shape one of them actually
 * produces.
 *
 * The rule throughout: anything that can't be trusted is dropped rather
 * than patched up. A blank suggestion card on screen looks like a broken
 * page, and prose attached to a missing summary reads as a system fault.
 */

import { describe, expect, it } from "vitest";

import { parseNarrativeReply } from "./llmNarrative.js";

const MODEL = "test-model";

/** A well-formed reply, as the prompt asks for. */
const clean = JSON.stringify({
  summary: "Your usage is a little above average for a business this size.",
  actions: [
    {
      title: "Set the aircon to 25°C",
      description: "Every degree lower adds roughly a tenth to its running cost.",
      impact: "medium",
    },
  ],
});

describe("a well-formed reply", () => {
  it("reads the summary and the actions", () => {
    const narrative = parseNarrativeReply(clean, MODEL);

    expect(narrative?.summary).toMatch(/little above average/);
    expect(narrative?.actions).toHaveLength(1);
    expect(narrative?.actions[0].impact).toBe("medium");
  });

  it("records which model wrote it", () => {
    // Free endpoints are swapped often; when old wording looks wrong this
    // is the only way to know what produced it.
    expect(parseNarrativeReply(clean, MODEL)?.model).toBe(MODEL);
  });
});

describe("a reply that isn't bare JSON", () => {
  it("reads it out of a markdown fence", () => {
    expect(parseNarrativeReply("```json\n" + clean + "\n```", MODEL)?.summary).toBeTruthy();
  });

  it("reads it out of surrounding chat", () => {
    const chatty = `Sure! Here is the analysis you asked for:\n\n${clean}\n\nHope this helps!`;

    expect(parseNarrativeReply(chatty, MODEL)?.summary).toBeTruthy();
  });
});

describe("a reply that can't be used", () => {
  it("rejects one with no JSON at all", () => {
    // Seen in the wild: a model answering the prompt as a conversation.
    expect(parseNarrativeReply("I'd be happy to help with that!", MODEL)).toBeNull();
  });

  it("rejects malformed JSON", () => {
    expect(parseNarrativeReply('{"summary": "unterminated', MODEL)).toBeNull();
  });

  it("rejects one with no summary", () => {
    // Actions without the explanation they belong to would appear on screen
    // as free-floating advice with no stated reason.
    const noSummary = JSON.stringify({ actions: [{ title: "a", description: "b" }] });

    expect(parseNarrativeReply(noSummary, MODEL)).toBeNull();
  });

  it("rejects a blank summary", () => {
    expect(parseNarrativeReply(JSON.stringify({ summary: "   " }), MODEL)).toBeNull();
  });
});

describe("actions that are only partly filled in", () => {
  it("drops one with no title", () => {
    const reply = JSON.stringify({
      summary: "Fine.",
      actions: [
        { description: "No title on this one." },
        { title: "Keeps this", description: "Has both." },
      ],
    });

    const actions = parseNarrativeReply(reply, MODEL)?.actions;
    expect(actions).toHaveLength(1);
    expect(actions?.[0].title).toBe("Keeps this");
  });

  it("drops one with no description", () => {
    // A card with a heading and nothing under it reads as a loading state
    // that never finished.
    const reply = JSON.stringify({
      summary: "Fine.",
      actions: [{ title: "Bare heading" }],
    });

    expect(parseNarrativeReply(reply, MODEL)?.actions).toHaveLength(0);
  });

  it("ignores entries that aren't objects", () => {
    const reply = JSON.stringify({
      summary: "Fine.",
      actions: ["just a string", null, { title: "Real", description: "Yes." }],
    });

    expect(parseNarrativeReply(reply, MODEL)?.actions).toHaveLength(1);
  });

  it("treats an unrecognised impact as medium", () => {
    // Models invent levels — "critical", "very high". Anything outside the
    // three the UI can render would otherwise reach a badge with no style.
    const reply = JSON.stringify({
      summary: "Fine.",
      actions: [{ title: "a", description: "b", impact: "critical" }],
    });

    expect(parseNarrativeReply(reply, MODEL)?.actions[0].impact).toBe("medium");
  });

  it("copes with actions missing entirely", () => {
    // The prompt allows an empty list when there's nothing to add, and some
    // models omit the key rather than sending [].
    expect(parseNarrativeReply(JSON.stringify({ summary: "Fine." }), MODEL)?.actions).toEqual([]);
  });
});

describe("a reply that is too long", () => {
  it("keeps only the first three actions", () => {
    // The prompt asks for at most three. A model that ignores that would
    // otherwise push a wall of suggestions onto the screen.
    const reply = JSON.stringify({
      summary: "Fine.",
      actions: Array.from({ length: 8 }, (_, i) => ({
        title: `Action ${i}`,
        description: "Something to do.",
      })),
    });

    expect(parseNarrativeReply(reply, MODEL)?.actions).toHaveLength(3);
  });
});

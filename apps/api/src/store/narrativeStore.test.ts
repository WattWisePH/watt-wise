/**
 * Tests for the profile fingerprint.
 *
 * This is what decides whether stored prose still describes the truth. Too
 * eager and every page view pays a model to rewrite the same paragraph; too
 * lax and the screen keeps explaining appliances the user has since
 * corrected. Both failures are silent, which is why they are pinned here.
 */

import { describe, expect, it } from "vitest";

import { profileFingerprint } from "./narrativeStore.js";

const base = {
  kwhUsed: 312,
  amount: 1785.5,
  peerAverageKwh: 300,
  comparedWithPeers: true,
  appliances: [
    { type: "Air Conditioner", count: 2, isInverter: false, ageYears: 9 },
    { type: "Refrigerator", count: 1, isInverter: true },
  ],
};

describe("inputs that mean the same thing", () => {
  it("hashes identically", () => {
    expect(profileFingerprint(base)).toBe(profileFingerprint({ ...base }));
  });

  it("ignores the order the appliances arrive in", () => {
    // listAppliances returns newest first, so re-saving an unchanged survey
    // reorders the list. Without sorting, that would look like new
    // information and pay for a rewrite of identical prose.
    const reordered = { ...base, appliances: [...base.appliances].reverse() };

    expect(profileFingerprint(reordered)).toBe(profileFingerprint(base));
  });
});

describe("inputs that have genuinely changed", () => {
  it("notices a different bill", () => {
    expect(profileFingerprint({ ...base, kwhUsed: 400 })).not.toBe(profileFingerprint(base));
  });

  it("notices a different amount", () => {
    expect(profileFingerprint({ ...base, amount: 2000 })).not.toBe(profileFingerprint(base));
  });

  it("notices an appliance being added", () => {
    const added = {
      ...base,
      appliances: [...base.appliances, { type: "Television", count: 1 }],
    };

    expect(profileFingerprint(added)).not.toBe(profileFingerprint(base));
  });

  it("notices an appliance's age being corrected", () => {
    const corrected = {
      ...base,
      appliances: [{ ...base.appliances[0], ageYears: 2 }, base.appliances[1]],
    };

    expect(profileFingerprint(corrected)).not.toBe(profileFingerprint(base));
  });

  it("notices an inverter flag changing", () => {
    const corrected = {
      ...base,
      appliances: [{ ...base.appliances[0], isInverter: true }, base.appliances[1]],
    };

    expect(profileFingerprint(corrected)).not.toBe(profileFingerprint(base));
  });

  it("distinguishes an unanswered inverter question from a 'no'", () => {
    // The engine treats these differently — undefined means the user never
    // claimed either — so prose written about one must not be reused for
    // the other.
    const unanswered = {
      ...base,
      appliances: [
        { type: "Air Conditioner", count: 2, ageYears: 9 },
        base.appliances[1],
      ],
    };

    expect(profileFingerprint(unanswered)).not.toBe(profileFingerprint(base));
  });

  it("notices the benchmark becoming a real comparison", () => {
    // The prompt says different things in each case, and the model is told
    // not to claim a peer comparison that never happened — so the text
    // written under one is wrong under the other.
    expect(profileFingerprint({ ...base, comparedWithPeers: false })).not.toBe(
      profileFingerprint(base),
    );
  });

  it("notices the peer average moving as the cohort grows", () => {
    expect(profileFingerprint({ ...base, peerAverageKwh: 280 })).not.toBe(
      profileFingerprint(base),
    );
  });
});

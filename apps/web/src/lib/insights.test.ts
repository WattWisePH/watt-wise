/**
 * Tests for the insights client.
 *
 * A thin wrapper over fetch, so what's worth pinning is the wire contract:
 * the nested path, an Authorization header, and — the one that isn't
 * obvious — that "no bills yet" arrives as a successful response rather
 * than an error. Treating it as a failure would put an error screen in
 * front of every new account.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authHeaders = vi.fn(async () => ({ Authorization: "Bearer test-token" }));
vi.mock("./session", () => ({ authHeaders, getAccessToken: async () => "test-token" }));

const { getInsights } = await import("./insights");
const { ApiError } = await import("./api");

const fetchMock = vi.fn();
const EST_ID = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

/** Shorthand for a fetch response. */
function respond(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

const ready = {
  available: true,
  result: {
    accountName: "Brew Corner Cafe",
    healthScore: 72,
    healthLabel: "Fair",
    benchmark: { peerAverageKwh: 300, deltaPct: 4 },
    recommendations: [],
  },
  benchmark: { source: "peers", cohortSize: 7 },
  basedOn: {
    billId: "bill-june",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    kwhUsed: 312,
    amount: 1785.5,
  },
};

describe("getInsights", () => {
  it("asks for the establishment's own insights", async () => {
    fetchMock.mockReturnValue(respond(200, ready));

    await getInsights(EST_ID);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`http://localhost:4000/api/establishments/${EST_ID}/insights`);
    expect(init.headers).toMatchObject({ Authorization: "Bearer test-token" });
  });

  it("returns the analysis as sent", async () => {
    fetchMock.mockReturnValue(respond(200, ready));

    await expect(getInsights(EST_ID)).resolves.toEqual(ready);
  });

  it("passes through an establishment with no bills as a normal result", async () => {
    // Not an error: this is the first state of every account, and the page
    // shows an empty screen for it rather than a failure.
    fetchMock.mockReturnValue(respond(200, { available: false, reason: "NO_BILLS" }));

    await expect(getInsights(EST_ID)).resolves.toEqual({
      available: false,
      reason: "NO_BILLS",
    });
  });

  it("throws ApiError with the server's message on failure", async () => {
    fetchMock.mockReturnValue(
      respond(502, { error: "DATABASE_ERROR", message: "Couldn't reach the database." }),
    );

    await expect(getInsights(EST_ID)).rejects.toThrow(ApiError);
    await expect(getInsights(EST_ID)).rejects.toThrow("Couldn't reach the database.");
  });

  it("still throws when the body isn't JSON", async () => {
    // A proxy or a crashed process can answer with HTML; the screen needs
    // an error it can show either way.
    fetchMock.mockReturnValue(
      Promise.resolve({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("not json");
        },
      }),
    );

    await expect(getInsights(EST_ID)).rejects.toThrow("Failed to load your insights");
  });
});

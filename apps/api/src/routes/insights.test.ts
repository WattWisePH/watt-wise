/**
 * Tests for the insights pipeline.
 *
 * The route's job is assembling a profile — picking the right bill, passing
 * appliances through, and deciding whether a peer average may be used at
 * all. The engine and the stores have their own tests, so those are mocked
 * and what is asserted here is the profile that reaches the engine.
 *
 * The case worth guarding hardest is the withheld benchmark: when the
 * cohort is too small to disclose, the profile must carry no peerAverageKwh
 * at all, and the response must not claim the comparison was against real
 * establishments.
 */

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../auth/verifyToken.js", () => ({
  isAuthConfigured: () => true,
  verifyAccessToken: async (token: string) => {
    if (!token.startsWith("user:")) return null;
    const id = token.slice("user:".length);
    return id ? { id, email: `${id}@example.com` } : null;
  },
}));

const EST_ID = "22222222-2222-2222-2222-222222222222";
const TYPE_ID = "11111111-1111-1111-1111-111111111111";

const getEstablishment = vi.fn();
vi.mock("../store/establishmentStore.js", () => ({
  getEstablishment,
  listEstablishments: vi.fn(),
  listEstablishmentTypes: vi.fn(),
  listProviders: vi.fn(),
  createEstablishment: vi.fn(),
}));

const listBills = vi.fn();
vi.mock("../store/billStore.js", () => ({ listBills, createBill: vi.fn(), getBill: vi.fn() }));

const listAppliances = vi.fn();
vi.mock("../store/applianceStore.js", () => ({
  listAppliances,
  createAppliances: vi.fn(),
  deleteAppliance: vi.fn(),
  listApplianceKinds: vi.fn(),
  listApplianceSubtypes: vi.fn(),
}));

const getPeerBenchmark = vi.fn();
vi.mock("../store/benchmarkStore.js", () => ({ getPeerBenchmark }));

const generate = vi.fn();
vi.mock("../engine/index.js", () => ({
  getRecommendationEngine: () => ({ name: "test-engine", generate }),
}));

const { DatabaseError } = await import("../store/supabaseClient.js");
const { createApp } = await import("../app.js");
const app = createApp();

const asUser = (id: string) => ({ Authorization: `Bearer user:${id}` });
const get = (userId = "u1") =>
  request(app).get(`/api/establishments/${EST_ID}/insights`).set(asUser(userId));

/** The bill the score should describe — newest, so first in the list. */
const latestBill = {
  id: "bill-june",
  kwhUsed: 312,
  amount: 1785.5,
  periodStart: "2026-06-01",
  periodEnd: "2026-06-30",
};
const olderBill = { id: "bill-may", kwhUsed: 280, amount: 1600, periodStart: null, periodEnd: null };

const engineResult = {
  accountName: "Brew Corner Cafe",
  healthScore: 72,
  healthLabel: "Fair",
  benchmark: { peerAverageKwh: 300, deltaPct: 4 },
  recommendations: [],
};

/** The profile handed to the engine on the most recent call. */
const profileSent = () => generate.mock.calls[0][0];

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_ANON_KEY = "anon-key";

  getEstablishment.mockResolvedValue({
    id: EST_ID,
    accountId: "u1",
    name: "Brew Corner Cafe",
    typeId: TYPE_ID,
    providerId: "33333333-3333-3333-3333-333333333333",
  });
  listBills.mockResolvedValue([latestBill, olderBill]);
  listAppliances.mockResolvedValue([]);
  getPeerBenchmark.mockResolvedValue({ peerAverageKwh: 300, cohortSize: 7 });
  generate.mockResolvedValue(engineResult);
});

describe("authentication and ownership", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get(`/api/establishments/${EST_ID}/insights`);
    expect(res.status).toBe(401);
  });

  it("404s an establishment that isn't the caller's", async () => {
    getEstablishment.mockResolvedValue(null);

    const res = await get();

    expect(res.status).toBe(404);
    expect(generate).not.toHaveBeenCalled();
  });
});

describe("when the establishment has bills", () => {
  it("scores the most recent one", async () => {
    const res = await get();

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
    expect(res.body.basedOn.billId).toBe("bill-june");
    expect(profileSent()).toMatchObject({ kwhUsed: 312, amount: 1785.5 });
  });

  it("names the establishment, since a bill no longer carries a name", async () => {
    await get();

    expect(profileSent().accountName).toBe("Brew Corner Cafe");
  });

  it("passes the appliances through for the engine's rules", async () => {
    const appliances = [
      { id: "a1", type: "Air Conditioner", count: 2, isInverter: false, ageYears: 9 },
    ];
    listAppliances.mockResolvedValue(appliances);

    await get();

    expect(profileSent().appliances).toEqual(appliances);
  });

  it("returns the engine's result unchanged", async () => {
    const res = await get();

    expect(res.body.result).toEqual(engineResult);
  });

  it("reports which period the figures describe", async () => {
    const res = await get();

    expect(res.body.basedOn).toEqual({
      billId: "bill-june",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
    });
  });
});

describe("the peer benchmark", () => {
  it("uses a disclosed average and says it came from peers", async () => {
    const res = await get();

    expect(profileSent().peerAverageKwh).toBe(300);
    expect(res.body.benchmark).toEqual({ source: "peers", cohortSize: 7 });
  });

  it("asks for the benchmark for this establishment's type", async () => {
    await get();

    expect(getPeerBenchmark).toHaveBeenCalledWith("user:u1", TYPE_ID);
  });

  it("omits the average entirely when the cohort was too small", async () => {
    // Not zero, and not the engine's default copied in here — absent, so
    // the engine applies its own reference figure and there is only ever
    // one definition of it.
    getPeerBenchmark.mockResolvedValue({ peerAverageKwh: null, cohortSize: 3 });

    const res = await get();

    expect(profileSent()).not.toHaveProperty("peerAverageKwh");
    expect(res.body.benchmark).toEqual({ source: "reference", cohortSize: 3 });
  });

  it("does not call a withheld comparison a peer comparison", async () => {
    // The UI writes "compared with N similar establishments" from this, so
    // mislabelling it would put a claim on screen that isn't true.
    getPeerBenchmark.mockResolvedValue({ peerAverageKwh: null, cohortSize: 4 });

    const res = await get();

    expect(res.body.benchmark.source).toBe("reference");
  });
});

describe("when the establishment has no bills", () => {
  it("answers 200 with nothing to show, not an error", async () => {
    // Every account starts here. A 404 would make the client treat the
    // normal first screen as a failure.
    listBills.mockResolvedValue([]);

    const res = await get();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: false, reason: "NO_BILLS" });
    expect(generate).not.toHaveBeenCalled();
  });
});

describe("when a read fails", () => {
  it("reports an unreachable database as a 502", async () => {
    listBills.mockRejectedValue(new DatabaseError("fetch failed"));

    expect((await get()).status).toBe(502);
  });

  it("reports a failed benchmark the same way, rather than scoring without it", async () => {
    // Silently continuing would produce a score built on the fallback while
    // the client believed it had real peers.
    getPeerBenchmark.mockRejectedValue(new DatabaseError("fetch failed"));

    expect((await get()).status).toBe(502);
  });
});

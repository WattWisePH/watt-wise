/**
 * Tests for marking priority actions done or dismissed, and restoring them.
 *
 * The store is mocked; what is covered is validation, the ownership gate
 * inherited from the establishments router, and the status codes.
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

const getEstablishment = vi.fn();
vi.mock("../store/establishmentStore.js", () => ({
  getEstablishment,
  listEstablishmentTypes: vi.fn(),
  listProviders: vi.fn(),
  createEstablishment: vi.fn(),
  listEstablishments: vi.fn(),
}));

const setActionStatus = vi.fn();
const clearActionStatus = vi.fn();
vi.mock("../store/actionStatusStore.js", () => ({
  setActionStatus,
  clearActionStatus,
  listActionStatuses: vi.fn(),
}));

const { createApp } = await import("../app.js");
const app = createApp();

const asUser = (id: string) => ({ Authorization: `Bearer user:${id}` });

const EST_ID = "33333333-3333-3333-3333-333333333333";
const BILL_ID = "44444444-4444-4444-4444-444444444444";
const url = `/api/establishments/${EST_ID}/actions/${BILL_ID}/high-vs-peers`;

const body = {
  status: "done",
  title: "Your usage is high",
  description: "Turn things off.",
  impact: "high",
  savings: { kwh: 30, php: 360 },
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_ANON_KEY = "anon-key";
  getEstablishment.mockResolvedValue({ id: EST_ID, accountId: "u1", name: "Cafe" });
  setActionStatus.mockResolvedValue(undefined);
  clearActionStatus.mockResolvedValue(true);
});

describe("PUT /actions/:billId/:actionId", () => {
  it("saves the status with the card as it read", async () => {
    const res = await request(app).put(url).set(asUser("u1")).send(body);

    expect(res.status).toBe(204);
    expect(setActionStatus).toHaveBeenCalledWith("user:u1", BILL_ID, "high-vs-peers", body);
  });

  it("accepts a card with no savings estimate", async () => {
    const res = await request(app)
      .put(url)
      .set(asUser("u1"))
      .send({ ...body, savings: undefined });

    expect(res.status).toBe(204);
    expect(setActionStatus.mock.calls[0][3].savings).toBeNull();
  });

  it("rejects an unknown status and writes nothing", async () => {
    const res = await request(app)
      .put(url)
      .set(asUser("u1"))
      .send({ ...body, status: "snoozed" });

    expect(res.status).toBe(400);
    expect(setActionStatus).not.toHaveBeenCalled();
  });

  it("404s a malformed bill id", async () => {
    const res = await request(app)
      .put(`/api/establishments/${EST_ID}/actions/not-a-uuid/x`)
      .set(asUser("u1"))
      .send(body);

    expect(res.status).toBe(404);
  });

  it("requires sign-in", async () => {
    const res = await request(app).put(url).send(body);
    expect(res.status).toBe(401);
  });
});

describe("DELETE /actions/:billId/:actionId", () => {
  it("restores the action", async () => {
    const res = await request(app).delete(url).set(asUser("u1"));

    expect(res.status).toBe(204);
    expect(clearActionStatus).toHaveBeenCalledWith("user:u1", BILL_ID, "high-vs-peers");
  });

  it("404s when there was nothing to restore", async () => {
    clearActionStatus.mockResolvedValue(false);
    const res = await request(app).delete(url).set(asUser("u1"));
    expect(res.status).toBe(404);
  });
});

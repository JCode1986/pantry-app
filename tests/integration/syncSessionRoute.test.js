import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionMock } from "@/tests/mocks/session";
import { createTestUser } from "@/tests/helpers/factories";

const syncMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  createTokenClient: vi.fn(),
  createServerClient: vi.fn(),
  tokenClient: null,
  serverClient: null,
}));

vi.mock("@/lib/sessionOptions", () => ({
  getSession: syncMocks.getSession,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: syncMocks.createTokenClient,
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: syncMocks.createServerClient,
}));

const { POST } = await import("@/app/api/sync-session/route");

function createSyncRequest(body, headers = {}) {
  return new Request("http://localhost:3000/api/sync-session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function readJson(response) {
  return response.json();
}

describe("sync-session API route", () => {
  beforeEach(() => {
    syncMocks.tokenClient = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: createTestUser() },
          error: null,
        })),
      },
    };
    syncMocks.serverClient = {
      auth: {
        setSession: vi.fn(async () => ({ error: null })),
      },
    };
    syncMocks.createTokenClient.mockReturnValue(syncMocks.tokenClient);
    syncMocks.createServerClient.mockResolvedValue(syncMocks.serverClient);
    syncMocks.getSession.mockResolvedValue(createSessionMock(null));
  });

  it("rejects requests from invalid origins", async () => {
    const response = await POST(
      createSyncRequest({}, { origin: "https://evil.example.test" })
    );

    expect(response.status).toBe(403);
    await expect(readJson(response)).resolves.toMatchObject({
      code: "invalid-origin",
    });
  });

  it("rejects missing and expired session tokens", async () => {
    const missing = await POST(createSyncRequest({}));
    expect(missing.status).toBe(400);
    await expect(readJson(missing)).resolves.toMatchObject({
      code: "missing-session-tokens",
    });

    const expired = await POST(
      createSyncRequest({
        access_token: "access_test",
        refresh_token: "refresh_test",
        expires_at: Math.floor(Date.now() / 1000) - 1,
      })
    );
    expect(expired.status).toBe(401);
    await expect(readJson(expired)).resolves.toMatchObject({
      code: "expired-session-token",
    });
  });

  it("rejects invalid Supabase tokens and mismatched client users", async () => {
    syncMocks.tokenClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid token" },
    });

    const invalid = await POST(
      createSyncRequest({
        access_token: "bad_access",
        refresh_token: "refresh_test",
        expires_at: Math.floor(Date.now() / 1000) + 60,
      })
    );

    expect(invalid.status).toBe(401);
    await expect(readJson(invalid)).resolves.toMatchObject({
      code: "invalid-session-token",
    });

    syncMocks.tokenClient.auth.getUser.mockResolvedValue({
      data: { user: createTestUser({ id: "verified_user" }) },
      error: null,
    });
    const mismatch = await POST(
      createSyncRequest({
        access_token: "access_test",
        refresh_token: "refresh_test",
        expires_at: Math.floor(Date.now() / 1000) + 60,
        user: { id: "spoofed_user" },
      })
    );

    expect(mismatch.status).toBe(403);
    await expect(readJson(mismatch)).resolves.toMatchObject({
      code: "session-user-mismatch",
    });
  });

  it("rejects tokens that cannot be installed into the server Supabase session", async () => {
    syncMocks.serverClient.auth.setSession.mockResolvedValue({
      error: { message: "Could not set session" },
    });

    const response = await POST(
      createSyncRequest({
        access_token: "access_test",
        refresh_token: "refresh_test",
        expires_at: Math.floor(Date.now() / 1000) + 60,
      })
    );

    expect(response.status).toBe(401);
    await expect(readJson(response)).resolves.toMatchObject({
      code: "server-session-sync-failed",
    });
  });

  it("saves verified Supabase tokens into Iron Session", async () => {
    const session = createSessionMock(null);
    syncMocks.getSession.mockResolvedValue(session);

    const response = await POST(
      createSyncRequest({
        access_token: "access_test",
        refresh_token: "refresh_test",
        expires_at: Math.floor(Date.now() / 1000) + 60,
        user: { id: "user_owner" },
      })
    );

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({ success: true });
    expect(session.user).toMatchObject({
      access_token: "access_test",
      refresh_token: "refresh_test",
      user: { id: "user_owner" },
    });
    expect(session.save).toHaveBeenCalledTimes(1);
  });
});

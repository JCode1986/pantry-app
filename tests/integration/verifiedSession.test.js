import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionMock } from "@/tests/mocks/session";
import { createTestUser } from "@/tests/helpers/factories";

const verifiedMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  createClient: vi.fn(),
  supabase: null,
}));

vi.mock("@/lib/sessionOptions", () => ({
  getSession: verifiedMocks.getSession,
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: verifiedMocks.createClient,
}));

const { getVerifiedSession } = await import("@/lib/verifiedSession");

function createVerifiedSupabase(overrides = {}) {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: createTestUser() },
        error: null,
      })),
      getSession: vi.fn(async () => ({
        data: {
          session: {
            access_token: "access_supabase",
            refresh_token: "refresh_supabase",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: createTestUser(),
          },
        },
        error: null,
      })),
      ...overrides.auth,
    },
  };
}

describe("verified session helper", () => {
  beforeEach(() => {
    verifiedMocks.supabase = createVerifiedSupabase();
    verifiedMocks.createClient.mockResolvedValue(verifiedMocks.supabase);
    verifiedMocks.getSession.mockResolvedValue(createSessionMock(createTestUser()));
  });

  it("trusts a fresh Iron Session when Supabase confirms the same user", async () => {
    const session = createSessionMock(createTestUser({ id: "user_owner" }));
    session.user.expires_at = Math.floor(Date.now() / 1000) + 600;
    verifiedMocks.getSession.mockResolvedValue(session);

    const result = await getVerifiedSession();

    expect(result).toMatchObject({
      user: { id: "user_owner" },
      accessToken: "access_test",
      refreshToken: "refresh_test",
      error: null,
    });
    expect(verifiedMocks.supabase.auth.getSession).not.toHaveBeenCalled();
    expect(session.save).not.toHaveBeenCalled();
  });

  it("destroys stale app sessions when Supabase has no valid user", async () => {
    const session = createSessionMock(createTestUser());
    verifiedMocks.getSession.mockResolvedValue(session);
    verifiedMocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "JWT expired" },
    });

    const result = await getVerifiedSession();

    expect(result.user).toBeNull();
    expect(result.error).toBe("Your session has expired. Please log in again.");
    expect(session.destroy).toHaveBeenCalledTimes(1);
  });

  it("repairs the app session from Supabase when Iron Session is missing tokens", async () => {
    const session = createSessionMock(createTestUser());
    session.user.access_token = null;
    session.user.refresh_token = null;
    verifiedMocks.getSession.mockResolvedValue(session);

    const result = await getVerifiedSession();

    expect(session.user.access_token).toBe("access_supabase");
    expect(session.save).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      accessToken: "access_supabase",
      refreshToken: "refresh_supabase",
      error: null,
    });
  });

  it("does not fail read-only request contexts when repaired session cookies cannot be saved", async () => {
    const session = createSessionMock(createTestUser());
    session.user.access_token = null;
    session.user.refresh_token = null;
    session.save.mockRejectedValue(new Error("Cookies can only be modified in a Server Action"));
    verifiedMocks.getSession.mockResolvedValue(session);

    const result = await getVerifiedSession();

    expect(result.error).toBeNull();
    expect(result.accessToken).toBe("access_supabase");
  });
});

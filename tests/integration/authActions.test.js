import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionMock } from "@/tests/mocks/session";
import { createTestUser } from "@/tests/helpers/factories";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  createClient: vi.fn(),
  supabase: null,
}));

vi.mock("@/lib/sessionOptions", () => ({
  getSession: authMocks.getSession,
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: authMocks.createClient,
}));

const {
  getSessionForLayout,
  login,
  logoutAction,
  refreshToken,
  refreshTokenIfNeeded,
  updatePasswordAction,
} = await import("@/app/actions/auth");

function createAuthSupabase(overrides = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn(async () => ({
        data: {
          session: {
            access_token: "access_new",
            refresh_token: "refresh_new",
            expires_at: 1000,
            user: createTestUser(),
          },
        },
        error: null,
      })),
      updateUser: vi.fn(async ({ data } = {}) => ({
        data: { user: createTestUser({ user_metadata: data ?? {} }) },
        error: null,
      })),
      signOut: vi.fn(async () => ({ error: null })),
      setSession: vi.fn(async () => ({
        data: {
          session: {
            access_token: "access_restored",
            refresh_token: "refresh_restored",
            expires_at: 2000,
            user: createTestUser(),
          },
        },
        error: null,
      })),
      refreshSession: vi.fn(async () => ({
        data: {
          session: {
            access_token: "access_refreshed",
            refresh_token: "refresh_refreshed",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: createTestUser(),
          },
        },
        error: null,
      })),
      getUser: vi.fn(async () => ({
        data: { user: createTestUser() },
        error: null,
      })),
      ...overrides.auth,
    },
    ...overrides,
  };
}

describe("auth server actions", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    authMocks.supabase = createAuthSupabase();
    authMocks.createClient.mockResolvedValue(authMocks.supabase);
    authMocks.getSession.mockResolvedValue(createSessionMock(null));
  });

  it("returns Supabase login errors without saving an app session", async () => {
    const session = createSessionMock(null);
    authMocks.getSession.mockResolvedValue(session);
    authMocks.supabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: "Invalid login credentials." },
    });

    const result = await login({
      email: "owner@example.test",
      password: "bad-password",
    });

    expect(result).toEqual({
      success: false,
      error: "Invalid login credentials.",
    });
    expect(session.save).not.toHaveBeenCalled();
  });

  it("returns deterministic invalid credentials in e2e auth mock mode", async () => {
    vi.stubEnv("WHEREKEEP_E2E_AUTH_MOCK", "1");

    const result = await login({
      email: "invalid@example.test",
      password: "wrong-password",
    });

    expect(result).toEqual({
      success: false,
      error: "Invalid login credentials.",
    });
    expect(authMocks.createClient).not.toHaveBeenCalled();
    expect(authMocks.getSession).not.toHaveBeenCalled();
  });

  it("returns a safe login error when Supabase auth is unavailable", async () => {
    const session = createSessionMock(null);
    authMocks.getSession.mockResolvedValue(session);
    authMocks.supabase.auth.signInWithPassword.mockRejectedValue(new Error("connect ECONNREFUSED"));

    const result = await login({
      email: "owner@example.test",
      password: "password",
    });

    expect(result).toEqual({
      success: false,
      code: "service-unavailable",
      error: "WhereKeep account access is temporarily unavailable while maintenance is in progress.",
    });
    expect(session.save).not.toHaveBeenCalled();
  });

  it("saves a successful login and rejects external redirects", async () => {
    const session = createSessionMock(null);
    authMocks.getSession.mockResolvedValue(session);

    const result = await login({
      email: "owner@example.test",
      password: "correct-password",
      redirectTo: "https://evil.example.test",
    });

    expect(authMocks.supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "owner@example.test",
      password: "correct-password",
    });
    expect(session.user.access_token).toBe("access_new");
    expect(session.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, error: null, redirectTo: "/" });
  });

  it("clears invite password setup metadata during login when needed", async () => {
    authMocks.supabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: "access_new",
          refresh_token: "refresh_new",
          expires_at: 1000,
          user: createTestUser({
            user_metadata: { requires_password_setup: true, theme: "ocean" },
          }),
        },
      },
      error: null,
    });

    const result = await login({
      email: "invite@example.test",
      password: "new-password",
      redirectTo: "/dashboard",
    });

    expect(authMocks.supabase.auth.updateUser).toHaveBeenCalledWith({
      data: { requires_password_setup: false, theme: "ocean" },
    });
    expect(result.redirectTo).toBe("/dashboard");
  });

  it("destroys both auth layers on logout", async () => {
    const session = createSessionMock(createTestUser());
    authMocks.getSession.mockResolvedValue(session);

    const result = await logoutAction();

    expect(session.destroy).toHaveBeenCalledTimes(1);
    expect(authMocks.supabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, error: null, redirectTo: "/logout" });
  });

  it("validates password updates before calling Supabase", async () => {
    await expect(updatePasswordAction({ password: "12345" })).resolves.toEqual({
      success: false,
      error: "Password must be at least 6 characters.",
    });
    expect(authMocks.createClient).not.toHaveBeenCalled();
  });

  it("requires the current password before updating a normal account password", async () => {
    const session = createSessionMock(createTestUser());
    authMocks.getSession.mockResolvedValue(session);

    const result = await updatePasswordAction({ password: "new-password" });

    expect(result).toEqual({
      success: false,
      error: "Enter your current password.",
    });
    expect(authMocks.supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("updates a password only when an app session can be restored", async () => {
    const session = createSessionMock(createTestUser());
    authMocks.getSession.mockResolvedValue(session);

    const result = await updatePasswordAction({
      currentPassword: "old-password",
      password: "new-password",
    });

    expect(authMocks.supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: "access_test",
      refresh_token: "refresh_test",
    });
    expect(authMocks.supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "owner@example.test",
      password: "old-password",
    });
    expect(authMocks.supabase.auth.updateUser).toHaveBeenCalledWith({
      password: "new-password",
      data: { requires_password_setup: false },
    });
    expect(session.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, error: null });
  });

  it("refreshes explicit refresh-token requests and updates the app session", async () => {
    const session = createSessionMock(createTestUser());
    authMocks.getSession.mockResolvedValue(session);

    await expect(refreshToken()).resolves.toEqual({ success: true });

    expect(authMocks.supabase.auth.refreshSession).toHaveBeenCalledWith({
      refresh_token: "refresh_test",
    });
    expect(session.user.access_token).toBe("access_refreshed");
    expect(session.save).toHaveBeenCalledTimes(1);
  });

  it("skips automatic refresh when the token is not near expiry", async () => {
    const session = createSessionMock(createTestUser());
    session.user.expires_at = Math.floor(Date.now() / 1000) + 600;
    authMocks.getSession.mockResolvedValue(session);

    const result = await refreshTokenIfNeeded();

    expect(result).toEqual({
      ok: true,
      refreshed: false,
      expires_at: session.user.expires_at,
    });
    expect(authMocks.supabase.auth.refreshSession).not.toHaveBeenCalled();
  });

  it("clears the session when automatic refresh fails", async () => {
    const session = createSessionMock(createTestUser());
    session.user.expires_at = Math.floor(Date.now() / 1000) + 30;
    authMocks.getSession.mockResolvedValue(session);
    authMocks.supabase.auth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: "Refresh failed." },
    });

    const result = await refreshTokenIfNeeded();

    expect(result).toEqual({ ok: false, reason: "refresh_failed" });
    expect(session.destroy).toHaveBeenCalledTimes(1);
    expect(authMocks.supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("returns layout sessions only when Supabase and Iron Session agree", async () => {
    const session = createSessionMock(createTestUser({ id: "user_owner" }));
    authMocks.getSession.mockResolvedValue(session);

    await expect(getSessionForLayout()).resolves.toMatchObject({
      user: {
        access_token: "access_test",
        user: { id: "user_owner" },
      },
    });

    authMocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: createTestUser({ id: "different_user" }) },
      error: null,
    });
    await expect(getSessionForLayout()).resolves.toBeNull();
  });
});

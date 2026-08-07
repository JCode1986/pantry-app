import { vi } from "vitest";
import { createTestUser } from "@/tests/helpers/factories";

export function createSessionMock(user = createTestUser()) {
  return {
    user: user
      ? {
          access_token: "access_test",
          refresh_token: "refresh_test",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user,
        }
      : null,
    save: vi.fn(async () => {}),
    destroy: vi.fn(() => {}),
  };
}

export function createVerifiedSessionMock(user = createTestUser()) {
  return {
    session: createSessionMock(user),
    user,
    accessToken: user ? "access_test" : null,
    refreshToken: user ? "refresh_test" : null,
    expiresAt: user ? Math.floor(Date.now() / 1000) + 3600 : null,
    error: user ? null : "Your session has expired. Please log in again.",
  };
}

'use server';

import { getSession } from "@/lib/sessionOptions";
import {
  SERVICE_UNAVAILABLE_CODE,
  SERVICE_UNAVAILABLE_MESSAGE,
  isServiceUnavailableError,
} from "@/utils/maintenance";

function isE2EAuthMockEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.WHEREKEEP_E2E_AUTH_MOCK === "1"
  );
}

function needsInvitePasswordSetup(user) {
  return Boolean(
    user?.user_metadata?.requires_password_setup &&
      (user?.invited_at || user?.user_metadata?.household_invite_token)
  );
}

/** LOGIN – server action */
export async function login({ email, password, redirectTo = "/dashboard" }) {
  if (isE2EAuthMockEnabled()) {
    return {
      success: false,
      error: "Invalid login credentials.",
    };
  }

  const { createClient } = await import('@/utils/supabase/server');
  const supa = await createClient();
  const session = await getSession();

  let signInResult;
  try {
    signInResult = await supa.auth.signInWithPassword({ email, password });
  } catch (err) {
    if (isServiceUnavailableError(err)) {
      return {
        success: false,
        code: SERVICE_UNAVAILABLE_CODE,
        error: SERVICE_UNAVAILABLE_MESSAGE,
      };
    }

    return {
      success: false,
      error: "Could not log in right now. Please try again.",
    };
  }

  const { data, error } = signInResult;

  if (error || !data?.session) {
    if (isServiceUnavailableError(error)) {
      return {
        success: false,
        code: SERVICE_UNAVAILABLE_CODE,
        error: SERVICE_UNAVAILABLE_MESSAGE,
      };
    }

    return {
      success: false,
      error: error.message || "Invalid login credentials.",
    };
  }

  let sessionUser = data.session.user;

  if (sessionUser?.user_metadata?.requires_password_setup) {
    const nextUserMetadata = {
      ...(sessionUser.user_metadata ?? {}),
      requires_password_setup: false,
    };

    const { data: updateData, error: updateError } = await supa.auth.updateUser({
      data: nextUserMetadata,
    });

    if (!updateError && updateData?.user) {
      sessionUser = updateData.user;
    } else if (updateError) {
      console.error("Password setup metadata cleanup failed:", updateError);
      sessionUser = {
        ...sessionUser,
        user_metadata: nextUserMetadata,
      };
    }
  }

  session.user = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: sessionUser,
  };
  await session.save();

  const safeRedirect =
    typeof redirectTo === "string" && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/";

  return {
    success: true,
    error: null,
    redirectTo: safeRedirect,
  };
}

export async function logoutAction() {
  const { createClient } = await import('@/utils/supabase/server');
  const supa = await createClient();
  const session = await getSession();

  // Destroy Iron Session
  session.destroy();

  // Log out Supabase cookie session
  const { error } = await supa.auth.signOut();
  if (error) {
    console.error("Error signing out Supabase:", error);
  }

  return {
    success: true,
    error: null,
    redirectTo: "/logout",
  };
}

export async function updatePasswordAction({ currentPassword, password }) {
  const normalizedCurrentPassword =
    typeof currentPassword === 'string' ? currentPassword : '';
  const normalizedPassword = typeof password === 'string' ? password : '';

  if (normalizedPassword.length < 6) {
    return {
      success: false,
      error: 'Password must be at least 6 characters.',
    };
  }

  const { createClient } = await import('@/utils/supabase/server');
  const supa = await createClient();
  const session = await getSession();
  const accessToken = session?.user?.access_token;
  const refreshToken = session?.user?.refresh_token;

  if (!accessToken || !refreshToken) {
    return {
      success: false,
      error: 'Your session has expired. Please log in again.',
    };
  }

  const { data: sessionData, error: sessionError } = await supa.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) {
    console.error('Password update session restore failed:', sessionError);
    return {
      success: false,
      error: sessionError.message || 'Your session has expired. Please log in again.',
    };
  }

  const sessionUser = sessionData?.session?.user ?? session?.user?.user;
  const mustVerifyCurrentPassword = !needsInvitePasswordSetup(sessionUser);

  let verifiedPasswordSession = null;

  if (mustVerifyCurrentPassword) {
    if (!normalizedCurrentPassword) {
      return {
        success: false,
        error: 'Enter your current password.',
      };
    }

    if (!sessionUser?.email) {
      return {
        success: false,
        error: 'Could not verify the current password for this account.',
      };
    }

    const { data: verifyData, error: verifyError } = await supa.auth.signInWithPassword({
      email: sessionUser.email,
      password: normalizedCurrentPassword,
    });

    if (verifyError) {
      return {
        success: false,
        error: 'Current password is incorrect.',
      };
    }

    verifiedPasswordSession = verifyData?.session ?? null;
  }

  const nextUserMetadata = {
    ...(sessionUser?.user_metadata ?? {}),
    requires_password_setup: false,
  };

  const { data, error } = await supa.auth.updateUser({
    password: normalizedPassword,
    data: nextUserMetadata,
  });

  if (error) {
    console.error('Password update failed:', error);
    return {
      success: false,
      error: error.message || 'Could not update password.',
    };
  }

  if (sessionData?.session || data?.user) {
    session.user = {
      access_token:
        verifiedPasswordSession?.access_token ??
        sessionData?.session?.access_token ??
        accessToken,
      refresh_token:
        verifiedPasswordSession?.refresh_token ??
        sessionData?.session?.refresh_token ??
        refreshToken,
      expires_at:
        verifiedPasswordSession?.expires_at ??
        sessionData?.session?.expires_at ??
        session?.user?.expires_at,
      user: data?.user ?? sessionData?.session?.user ?? session?.user?.user,
    };
    await session.save();
  }

  return { success: true, error: null };
}


/** REFRESH TOKEN – server action, for explicit refresh flows, not layout */
export async function refreshToken() {
  const session = await getSession();
  const refresh_token = session?.user?.refresh_token;

  if (!refresh_token) {
    throw new Error("Missing refresh token");
  }

  const { createClient } = await import('@/utils/supabase/server');
  const supa = await createClient();
  const { data, error } = await supa.auth.refreshSession({ refresh_token });

  if (error || !data?.session) {
    throw new Error(error?.message || "Failed to refresh session");
  }

  const newSession = data.session;

  session.user = {
    access_token: newSession.access_token,
    refresh_token: newSession.refresh_token,
    expires_at: newSession.expires_at,
    user: newSession.user,
  };
  await session.save();

  return { success: true };
}

export async function refreshTokenIfNeeded() {
  const session = await getSession();
  const user = session?.user;

  if (!user?.refresh_token || !user?.expires_at) {
    // No session or no refresh token – nothing to do
    return { ok: false, reason: "no_session" };
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = user.expires_at;

  // If token is still >90 seconds away from expiry, skip refresh
  if (expiresAt - now > 90) {
    return { ok: true, refreshed: false, expires_at: expiresAt };
  }

  // ⚠️ Token is close to expiring -> refresh via Supabase
  const { createClient } = await import('@/utils/supabase/server');
  const supa = await createClient();
  const { data, error } = await supa.auth.refreshSession({
    refresh_token: user.refresh_token,
  });

  if (error || !data?.session) {
    console.warn("Failed to refresh Supabase session", error);

    // Best effort: clear Iron Session + Supabase
    session.destroy();
    try {
      const { createClient } = await import('@/utils/supabase/server');
      const supa = await createClient();
      await supa.auth.signOut();
    } catch (e) {
      console.warn("Error on supabase.signOut after refresh fail", e);
    }

    return { ok: false, reason: "refresh_failed" };
  }

  const newSession = data.session;

  // Update Iron Session with new tokens
  session.user = {
    access_token: newSession.access_token,
    refresh_token: newSession.refresh_token,
    expires_at: newSession.expires_at,
    user: newSession.user,
  };
  await session.save();

  return {
    ok: true,
    refreshed: true,
    expires_at: newSession.expires_at,
  };
}

/**
 * READ-ONLY helper for layouts / server components.
 * ⚠️ This MUST NOT modify cookies.
 */
export async function getSessionForLayout() {
  const session = await getSession(); // iron-session read is OK
  const sessionUser = session?.user?.user;

  if (!session?.user?.access_token || !sessionUser?.id) {
    return null;
  }

  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supa = await createClient();
    const {
      data: { user },
      error,
    } = await supa.auth.getUser();

    if (error || !user?.id || user.id !== sessionUser.id) {
      return null;
    }

    return {
      ...session,
      user: {
        ...session.user,
        user,
      },
    };
  } catch (err) {
    console.warn("Could not verify layout session:", err);
    return null;
  }
}

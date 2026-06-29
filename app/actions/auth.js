'use server';

import { getSession } from "@/lib/sessionOptions";
import { supabase } from "@/lib/supabaseClient";
import { redirect } from "next/navigation";

/** LOGIN – server action */
export async function login({ email, password }) {
  const { createClient } = await import('@/utils/supabase/server');
  const supa = await createClient();
  const session = await getSession();

  const { data, error } = await supa.auth.signInWithPassword({ email, password });

  if (error) throw new Error(error.message);

  session.user = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: data.session.user,
  };
  await session.save();

  redirect("/");
}

export async function logoutAction() {
  const session = await getSession();

  // Destroy Iron Session
  session.destroy();

  // Log out Supabase cookie session
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error signing out Supabase:", error);
  }

  redirect('/login');
}

export async function updatePasswordAction({ password }) {
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

  const { data, error } = await supa.auth.updateUser({
    password: normalizedPassword,
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
      access_token: sessionData?.session?.access_token ?? accessToken,
      refresh_token: sessionData?.session?.refresh_token ?? refreshToken,
      expires_at: sessionData?.session?.expires_at ?? session?.user?.expires_at,
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

  const { data, error } = await supabase.auth.refreshSession({ refresh_token });

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
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: user.refresh_token,
  });

  if (error || !data?.session) {
    console.warn("Failed to refresh Supabase session", error);

    // Best effort: clear Iron Session + Supabase
    session.destroy();
    try {
      await supabase.auth.signOut();
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
  return session ?? null;
}

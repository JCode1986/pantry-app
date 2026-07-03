import { getSession } from '@/lib/sessionOptions';
import { createClient } from '@/utils/supabase/server';

export async function getVerifiedSession() {
  const session = await getSession();
  const ironSession = session?.user;
  const ironUser = ironSession?.user;
  const now = Math.floor(Date.now() / 1000);

  if (
    ironSession?.access_token &&
    ironSession?.refresh_token &&
    ironUser?.id &&
    Number(ironSession.expires_at ?? 0) > now + 30
  ) {
    return {
      session,
      user: ironUser,
      accessToken: ironSession.access_token,
      refreshToken: ironSession.refresh_token,
      expiresAt: ironSession.expires_at,
      error: null,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return {
      session,
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      error: 'Your session has expired. Please log in again.',
    };
  }

  const {
    data: { session: supabaseSession },
  } = await supabase.auth.getSession();

  if (supabaseSession?.access_token && supabaseSession?.refresh_token) {
    session.user = {
      access_token: supabaseSession.access_token,
      refresh_token: supabaseSession.refresh_token,
      expires_at: supabaseSession.expires_at,
      user,
    };
    await session.save();

    return {
      session,
      user,
      accessToken: supabaseSession.access_token,
      refreshToken: supabaseSession.refresh_token,
      expiresAt: supabaseSession.expires_at,
      error: null,
    };
  }

  return {
    session,
    user,
    accessToken: ironSession?.access_token ?? null,
    refreshToken: ironSession?.refresh_token ?? null,
    expiresAt: ironSession?.expires_at ?? null,
    error: null,
  };
}

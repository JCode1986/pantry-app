import { getSession } from '@/lib/sessionOptions';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { isAllowedOrigin } from '@/utils/urlSecurity';

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getTokenClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase token validation client is not configured.');
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function POST(req) {
  try {
    if (!isAllowedOrigin(req.headers.get('origin'))) {
      return json({ code: 'invalid-origin', error: 'Invalid request origin.' }, 403);
    }

    const body = await req.json();
    const accessToken =
      typeof body?.access_token === 'string' ? body.access_token : '';
    const refreshToken =
      typeof body?.refresh_token === 'string' ? body.refresh_token : '';
    const expiresAt = Number(body?.expires_at);

    if (!accessToken || !refreshToken || !Number.isFinite(expiresAt)) {
      return json({ code: 'missing-session-tokens', error: 'Session tokens are required.' }, 400);
    }

    if (expiresAt <= Math.floor(Date.now() / 1000)) {
      return json({ code: 'expired-session-token', error: 'Session token has expired.' }, 401);
    }

    const supabase = getTokenClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user?.id) {
      return json({ code: 'invalid-session-token', error: 'Invalid session token.' }, 401);
    }

    if (body?.user?.id && body.user.id !== user.id) {
      return json({ code: 'session-user-mismatch', error: 'Session user mismatch.' }, 403);
    }

    const serverSupabase = await createClient();
    const { error: setSessionError } = await serverSupabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (setSessionError) {
      return json({
        code: 'server-session-sync-failed',
        error: setSessionError.message || 'Failed to sync server session.',
      }, 401);
    }

    const session = await getSession();

    // Save verified tokens in Iron Session.
    session.user = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      user,
    };

    await session.save();

    return json({ success: true });
  } catch (err) {
    console.error('API sync-session error:', err);
    return json({ code: 'sync-exception', error: 'Failed to sync session' }, 500);
  }
}

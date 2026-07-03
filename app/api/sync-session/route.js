import { getSession } from '@/lib/sessionOptions';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
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
      return json({ error: 'Invalid request origin.' }, 403);
    }

    const body = await req.json();
    const accessToken =
      typeof body?.access_token === 'string' ? body.access_token : '';
    const refreshToken =
      typeof body?.refresh_token === 'string' ? body.refresh_token : '';
    const expiresAt = Number(body?.expires_at);

    if (!accessToken || !refreshToken || !Number.isFinite(expiresAt)) {
      return json({ error: 'Session tokens are required.' }, 400);
    }

    if (expiresAt <= Math.floor(Date.now() / 1000)) {
      return json({ error: 'Session token has expired.' }, 401);
    }

    const supabase = getTokenClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user?.id) {
      return json({ error: 'Invalid session token.' }, 401);
    }

    if (body?.user?.id && body.user.id !== user.id) {
      return json({ error: 'Session user mismatch.' }, 403);
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
    return json({ error: 'Failed to sync session' }, 500);
  }
}

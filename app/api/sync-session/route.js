import { getSession } from '@/lib/sessionOptions';

export async function POST(req) {
  try {
    const body = await req.json();
    const session = await getSession();

    console.log(body, 'body')

    // Save tokens in Iron Session
    session.user = {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      expires_at: body.expires_at,
      user: body.user,
    };

    await session.save();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('API sync-session error:', err);
    return new Response(JSON.stringify({ error: 'Failed to sync session' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

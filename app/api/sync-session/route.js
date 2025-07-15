import { getSession } from '@/lib/sessionOptions';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const session = await getSession();
    const body = await req.json();

    session.user = {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      user: body.user,
      expires_at: Date.now() / 1000 + 3600, // Optional: Set expiry (1hr)
    };

    await session.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error saving Iron Session:', err);
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
  }
}

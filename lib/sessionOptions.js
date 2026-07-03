import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';

export const sessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD, // 32+ chars
  cookieName: 'pantry_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  },
};

export async function getSession() {
  const session = await getIronSession(await cookies(), sessionOptions);
  return session;
}

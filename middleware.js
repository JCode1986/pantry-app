import { NextResponse } from 'next/server';
import { getSession } from './lib/sessionOptions';

export async function middleware(req) {
  const session = await getSession();
  const token = session?.user?.access_token;

  console.log('token:', token);

  const isLoginPage = req.nextUrl.pathname === '/login';
  const protectedPaths = ['/', '/fridge', '/favorites'];
  const isProtected = protectedPaths.includes(req.nextUrl.pathname);

  // ✅ If no user and protected path, redirect to login
  if (!token && isProtected && !isLoginPage) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

    if (token && session?.user?.expires_at < Date.now() / 1000) {
    console.log('Token expired. Forcing logout.');
    session.destroy();
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // ✅ If user is logged in and trying to access login, redirect home
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

// import { updateSession } from '@/utils/supabase/middleware'

// export async function middleware(request) {
//   return await updateSession(request)
// }

// export const config = {
//   matcher: [
//     /*
//      * Match all request paths except for the ones starting with:
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico (favicon file)
//      * Feel free to modify this pattern to include more paths.
//      */
//     '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
//   ],
// }
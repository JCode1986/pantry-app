import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function middleware(req) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    const protectedPaths = ['/', '/fridge', '/favorites'];
    const isProtected = protectedPaths.includes(req.nextUrl.pathname);
    const isLoginPage = req.nextUrl.pathname === '/login';

    // 🚫 If not logged in and accessing a protected page → redirect to login with redirectTo
    if (!session && isProtected) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 🚫 If logged in and trying to access login page → redirect home
    if (session && isLoginPage) {
        return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

import { NextResponse } from "next/server";
import { getSession } from "./lib/sessionOptions";
import { updateSession } from "./utils/supabase/middleware";

function copyCookies(source, target) {
  source.cookies.getAll().forEach((cookie) => {
    const { name, value, ...options } = cookie;
    target.cookies.set(name, value, options);
  });
  return target;
}

function redirectWithCookies(url, sourceResponse) {
  return copyCookies(sourceResponse, NextResponse.redirect(url));
}

function isSupabaseAuthCookie(name) {
  return (
    name.startsWith("sb-") &&
    (name.includes("-auth-token") || name.includes("-auth-token."))
  );
}

function clearAuthCookies(response, request) {
  response.cookies.delete("pantry_session");

  request.cookies.getAll().forEach((cookie) => {
    if (isSupabaseAuthCookie(cookie.name)) {
      response.cookies.delete(cookie.name);
    }
  });

  response.cookies.getAll().forEach((cookie) => {
    if (isSupabaseAuthCookie(cookie.name)) {
      response.cookies.delete(cookie.name);
    }
  });

  return response;
}

function hasSupabaseAuthCookie(request) {
  return request.cookies.getAll().some((cookie) => isSupabaseAuthCookie(cookie.name));
}

export async function middleware(req) {
  const { response: supabaseResponse, user } = await updateSession(req);
  const session = await getSession();
  const hasAppSession = Boolean(session?.user?.access_token);
  const hasSupabaseAuthSession = hasSupabaseAuthCookie(req);

  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === "/login";
  const isSignupPage = pathname === "/signup";
  const isAuthPage = isLoginPage || isSignupPage;

  const protectedRoots = [
    "/locations",
    "/storage-areas",
    "/areas",
    "/storage",
    "/categories",
    "/items",
    "/shopping-list",
    "/profile",
  ];
  const isProtected = protectedRoots.some(
    (root) => pathname === root || pathname.startsWith(root + "/")
  );

  if (!user && hasAppSession) {
    session.destroy();
  }

  // If Supabase has no active user for a protected route, send them through login.
  if (!user && isProtected && !isAuthPage) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set(
      "redirectTo",
      `${pathname}${req.nextUrl.search}`
    );
    const redirect = redirectWithCookies(loginUrl, supabaseResponse);
    return clearAuthCookies(redirect, req);
  }

  if (!user && (hasAppSession || hasSupabaseAuthSession)) {
    return clearAuthCookies(supabaseResponse, req);
  }

  // If both auth layers agree the user is signed in, keep auth pages out of the way.
  // If Iron Session is missing, allow /login so the app session can be repaired.
  if (isAuthPage && user && hasAppSession) {
    const redirectTo = req.nextUrl.searchParams.get("redirectTo");
    const safeRedirect =
      redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
        ? redirectTo
        : "/";

    return redirectWithCookies(new URL(safeRedirect, req.url), supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

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
  response.cookies.delete("wherekeep_auth_state");

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

function syncAuthMarkerCookie(response, isAuthenticated) {
  if (isAuthenticated) {
    response.cookies.set("wherekeep_auth_state", "1", {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
  } else {
    response.cookies.delete("wherekeep_auth_state");
  }

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
    "/dashboard",
    "/locations",
    "/storage-areas",
    "/areas",
    "/storage",
    "/categories",
    "/items",
    "/shopping-list",
    "/tasks",
    "/profile",
    "/support/chat",
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

  if (pathname === "/" && user && hasAppSession) {
    return syncAuthMarkerCookie(
      redirectWithCookies(new URL("/dashboard", req.url), supabaseResponse),
      true
    );
  }

  // If both auth layers agree the user is signed in, keep auth pages out of the way.
  // If Iron Session is missing, allow /login so the app session can be repaired.
  if (isAuthPage && user && hasAppSession) {
    const redirectTo = req.nextUrl.searchParams.get("redirectTo");
    const safeRedirect =
      redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
        ? redirectTo
        : "/dashboard";

    return syncAuthMarkerCookie(
      redirectWithCookies(new URL(safeRedirect, req.url), supabaseResponse),
      true
    );
  }

  return syncAuthMarkerCookie(supabaseResponse, Boolean(user && hasAppSession));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

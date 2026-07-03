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

export async function middleware(req) {
  const { response: supabaseResponse, user } = await updateSession(req);
  const session = await getSession();
  const requiresPasswordSetup = Boolean(
    user?.user_metadata?.requires_password_setup ||
      session?.user?.user?.user_metadata?.requires_password_setup
  );

  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === "/login";
  const isSignupPage = pathname === "/signup";
  const isAuthPage = isLoginPage || isSignupPage;
  const isProfilePage = pathname === "/profile" || pathname.startsWith("/profile/");
  const isInvitePage = pathname === "/invite" || pathname.startsWith("/invite/");
  const isMagicLinkSyncPage = pathname === "/magic-link-sync";

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

  // If Supabase has no active user for a protected route, send them through login.
  if (!user && isProtected && !isAuthPage) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set(
      "redirectTo",
      `${pathname}${req.nextUrl.search}`
    );
    const redirect = redirectWithCookies(loginUrl, supabaseResponse);
    redirect.cookies.delete("pantry_session");
    return redirect;
  }

  if (
    user &&
    requiresPasswordSetup &&
    !isProfilePage &&
    !isInvitePage &&
    !isMagicLinkSyncPage
  ) {
    return redirectWithCookies(
      new URL("/profile?setup=password", req.url),
      supabaseResponse
    );
  }

  // If an active Supabase user hits an auth page, send them home.
  if (isAuthPage && user) {
    if (requiresPasswordSetup) {
      return redirectWithCookies(
        new URL("/profile?setup=password", req.url),
        supabaseResponse
      );
    }

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

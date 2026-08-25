import { NextResponse } from "next/server";
import { getSession } from "./lib/sessionOptions";
import {
  MAINTENANCE_PATH,
  isMaintenanceModeEnabled,
} from "./utils/maintenance";
import { updateSession } from "./utils/supabase/middleware";

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

const authFlowRoots = [
  "/auth/confirm",
  "/forgot-password",
  "/invite",
  "/login",
  "/magic-link-sync",
  "/reset-password",
  "/signup",
];

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

function isPathInRoots(pathname, roots) {
  return roots.some((root) => pathname === root || pathname.startsWith(root + "/"));
}

function isMaintenanceSensitivePath(pathname) {
  return isPathInRoots(pathname, protectedRoots) || isPathInRoots(pathname, authFlowRoots);
}

function redirectToMaintenance(req, sourceResponse = null) {
  const maintenanceUrl = new URL(MAINTENANCE_PATH, req.url);
  const from = `${req.nextUrl.pathname}${req.nextUrl.search}`;

  if (from && from !== MAINTENANCE_PATH) {
    maintenanceUrl.searchParams.set("from", from);
  }

  return sourceResponse
    ? redirectWithCookies(maintenanceUrl, sourceResponse)
    : NextResponse.redirect(maintenanceUrl);
}

export async function middleware(req) {
  if (
    process.env.NODE_ENV === "production" &&
    req.nextUrl.hostname.toLowerCase() === "wherekeep.com"
  ) {
    const canonicalUrl = req.nextUrl.clone();
    canonicalUrl.protocol = "https:";
    canonicalUrl.hostname = "www.wherekeep.com";
    return NextResponse.redirect(canonicalUrl, 308);
  }

  const { pathname } = req.nextUrl;
  const isMaintenancePage = pathname === MAINTENANCE_PATH;
  const isLoginPage = pathname === "/login";
  const isSignupPage = pathname === "/signup";
  const isAuthPage = isLoginPage || isSignupPage;
  const isProtected = isPathInRoots(pathname, protectedRoots);
  const maintenanceEnabled = isMaintenanceModeEnabled(
    process.env.WHEREKEEP_MAINTENANCE_MODE ||
      process.env.NEXT_PUBLIC_MAINTENANCE_MODE
  );

  if (isMaintenancePage) {
    return NextResponse.next({ request: req });
  }

  if (maintenanceEnabled && isMaintenanceSensitivePath(pathname)) {
    return redirectToMaintenance(req);
  }

  let supabaseResponse;
  let user;

  try {
    ({ response: supabaseResponse, user } = await updateSession(req));
  } catch (err) {
    console.warn("Supabase session unavailable in middleware:", err);

    if (isMaintenanceSensitivePath(pathname)) {
      return redirectToMaintenance(req);
    }

    return NextResponse.next({ request: req });
  }

  const session = await getSession();
  const hasAppSession = Boolean(session?.user?.access_token);
  const hasSupabaseAuthSession = hasSupabaseAuthCookie(req);

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

import { NextResponse } from "next/server";
import { getSession } from "./lib/sessionOptions";

export async function middleware(req) {
  const session = await getSession();
  const token = session?.user?.access_token;
  const requiresPasswordSetup = Boolean(
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

  // If no token and protected route, redirect to login.
  if (!token && isProtected && !isAuthPage) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    token &&
    requiresPasswordSetup &&
    !isProfilePage &&
    !isInvitePage &&
    !isMagicLinkSyncPage
  ) {
    return NextResponse.redirect(new URL("/profile?setup=password", req.url));
  }

  // Optional: if token exists and user hits an auth page, send them home
  if (isAuthPage && token) {
    if (requiresPasswordSetup) {
      return NextResponse.redirect(new URL("/profile?setup=password", req.url));
    }

    const redirectTo = req.nextUrl.searchParams.get("redirectTo");
    const safeRedirect =
      redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
        ? redirectTo
        : "/";

    return NextResponse.redirect(new URL(safeRedirect, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

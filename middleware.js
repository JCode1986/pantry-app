import { NextResponse } from "next/server";
import { getSession } from "./lib/sessionOptions";

export async function middleware(req) {
  const session = await getSession();
  const token = session?.user?.access_token;

  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === "/login";

  const protectedRoots = ["/", "/locations", "/storage-areas", "/areas", "/storage", "/categories", "/items", "/profile"];
  const isProtected = protectedRoots.some(
    (root) => pathname === root || pathname.startsWith(root + "/")
  );

  // If no token & protected route → login
  if (!token && isProtected && !isLoginPage) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Optional: if token exists and user hits /login, send them home
  if (isLoginPage && token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

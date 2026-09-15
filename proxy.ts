import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth";

// Public API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

// Public pages that don't require authentication
const PUBLIC_PAGES = ["/login", "/forgot-password", "/reset-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files
  if (pathname.startsWith("/_next") || pathname.startsWith("/uploads") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for access token in Authorization header
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  // Also check for refresh token in cookie (for web clients)
  const refreshToken = request.cookies.get("refreshToken")?.value;

  const isAuthenticated = !!(token || refreshToken);

  // If logged in and trying to access public auth pages → redirect to dashboard
  if (isAuthenticated && PUBLIC_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Allow public pages for unauthenticated users
  if (PUBLIC_PAGES.includes(pathname)) {
    return NextResponse.next();
  }

  // If not logged in and trying to access protected page → redirect to login
  if (!isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If we have a token, verify it
  if (token) {
    const payload = verifyAccessToken(token);
    if (!payload) {
      // Token expired or invalid
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Token expired" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

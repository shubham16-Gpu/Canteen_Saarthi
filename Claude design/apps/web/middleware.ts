import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set([
  "/login",
  "/forgot-password",
  "/favicon.ico",
  "/api/health",
]);

/**
 * Cookies on localhost are NOT port-isolated by browsers (RFC compat).
 * To run separate role sessions on :3000-:3003 simultaneously without
 * bleed, we use a port-suffixed cookie name: `auth_token_<port>`.
 * Falls back to plain `auth_token` for prod/single-port deployments.
 */
function readToken(request: NextRequest): string | undefined {
  const port = request.nextUrl.port;
  if (port) {
    const portCookie = request.cookies.get(`auth_token_${port}`)?.value;
    if (portCookie) return portCookie;
  }
  return request.cookies.get("auth_token")?.value;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = readToken(request);

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type UserRole = "owner" | "manager" | "employee";

interface TokenPayload {
  sub: string;
  tid: string;
  role: UserRole;
  exp: number;
}

/** Decode JWT payload without verification (verification happens server-side) */
function decodeJWT(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

/** Route access rules by role */
const routeRoles: Record<string, UserRole[]> = {
  "/admin": ["owner", "manager"],
  "/operario": ["owner", "manager", "employee"],
};

const publicPaths = ["/", "/login", "/registro"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    publicPaths.some((p) => pathname === p) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Allow public tenant landing pages: /[slug]
  // These are single-segment paths that aren't admin/operario/login
  const segments = pathname.split("/").filter(Boolean);
  if (
    segments.length === 1 &&
    !["admin", "operario", "login", "registro"].includes(segments[0])
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeJWT(token);

  if (!payload || payload.exp * 1000 < Date.now()) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("access_token");
    return response;
  }

  // Check role-based access
  for (const [routePrefix, allowedRoles] of Object.entries(routeRoles)) {
    if (pathname.startsWith(routePrefix)) {
      if (!allowedRoles.includes(payload.role)) {
        // Redirect to appropriate dashboard based on role
        const redirectPath = payload.role === "employee" ? "/operario" : "/admin";
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }
  }

  // Inject tenant_id header for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", payload.tid);
  requestHeaders.set("x-user-id", payload.sub);
  requestHeaders.set("x-user-role", payload.role);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

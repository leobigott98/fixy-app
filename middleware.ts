import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { sessionCookieName } from "@/lib/auth/session";

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(sessionCookieName)?.value;
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isAppRoute = pathname.startsWith("/app");

  if (isAppRoute && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/app/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/signup", "/forgot-password"],
};

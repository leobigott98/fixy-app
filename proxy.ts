import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { sessionCookieName } from "@/lib/auth/constants";
import { listViewCookieName } from "@/lib/view-preference-constants";

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

export function proxy(request: NextRequest) {
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

  const response = NextResponse.next();
  const requestedView = request.nextUrl.searchParams.get("view");

  if (requestedView === "cards" || requestedView === "table") {
    response.cookies.set(listViewCookieName, requestedView, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/login", "/signup", "/forgot-password"],
};

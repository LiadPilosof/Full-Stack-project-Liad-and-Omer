import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

// Reachable without a session. Everything else redirects to /login.
const PUBLIC_PATHS = ["/login", "/verify", "/auth"];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!user && !isPublic && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return withRefreshedCookies(NextResponse.redirect(url), response);
  }

  if (user && (pathname === "/login" || pathname === "/verify")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return withRefreshedCookies(NextResponse.redirect(url), response);
  }

  return response;
}

/**
 * A redirect built here replaces the response `updateSession` prepared, so the
 * refreshed auth cookies have to be copied across or the session it just
 * renewed is thrown away.
 */
function withRefreshedCookies(
  redirect: NextResponse,
  source: NextResponse,
): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export const config = {
  // Skip static assets and image files: running auth on every icon request
  // would add a round trip to Supabase for no reason.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

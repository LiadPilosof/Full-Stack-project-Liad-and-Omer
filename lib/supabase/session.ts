import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

/**
 * Refreshes the Supabase session on every request and returns the response
 * carrying any updated cookies, plus the verified user.
 *
 * Access tokens expire after an hour. Without this, a Server Component would
 * read an expired cookie and treat a logged-in user as a stranger.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        // Rebuild the response so the refreshed cookies reach both the current
        // render and the browser.
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() validates the token against Supabase's auth server.
  // getSession() only decodes the cookie, which a client can tamper with, so it
  // must never be used to make an authorization decision.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}

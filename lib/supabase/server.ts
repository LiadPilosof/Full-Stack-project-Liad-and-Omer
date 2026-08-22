import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 *
 * Reads the session from the request cookies, so every query runs as the
 * logged-in user and Row Level Security applies. Create a new one per request:
 * a module-level singleton would leak one user's session into another's.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components are not allowed to set cookies. Refreshing the
          // session is the middleware's job, so ignoring this is correct.
        }
      },
    },
  });
}

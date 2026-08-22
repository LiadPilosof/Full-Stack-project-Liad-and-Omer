import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

/**
 * Supabase client for Client Components ("use client").
 *
 * Use this only for auth calls that must happen in the browser, such as signing
 * in and signing out, where the library needs to write the session cookie.
 * Data reads belong in Server Components via lib/supabase/server.ts, so payroll
 * numbers are never fetched by browser JavaScript.
 */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}

import { NextResponse, type NextRequest } from "next/server";

import { getContext, roleHome } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

/**
 * Lands the magic link: trades the one-time code for a session cookie, then
 * sends the user to the home page of whichever role they hold.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const requested = searchParams.get("next");
  const next =
    requested && requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : null;

  const ctx = await getContext();
  const destination =
    next ?? (ctx?.membership ? roleHome(ctx.membership.role) : "/no-access");

  return NextResponse.redirect(`${origin}${destination}`);
}

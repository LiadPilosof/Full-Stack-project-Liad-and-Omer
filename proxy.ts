import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  const { response } = await updateSession(request);
  return response;
}

export const config = {
  // Skip static assets and image files: running auth on every icon request
  // would add a round trip to Supabase for no reason.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

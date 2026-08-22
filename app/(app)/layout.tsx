import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireMembership } from "@/lib/auth/context";

/**
 * Resolves identity once per request and hands it to the shell, so no page
 * below repeats the auth round trip.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireMembership();

  return (
    <AppShell
      membership={ctx.membership}
      profile={ctx.profile}
      email={ctx.email}
    >
      {children}
    </AppShell>
  );
}

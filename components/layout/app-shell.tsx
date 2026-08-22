import type { ReactNode } from "react";

import { navGroupsFor } from "@/components/layout/nav-items";
import { RoleBadge } from "@/components/layout/role-badge";
import { SideNav } from "@/components/layout/side-nav";
import type { ActiveMembership, Profile } from "@/types/app";

export function AppShell({
  membership,
  profile,
  email,
  children,
}: {
  membership: ActiveMembership;
  profile: Profile | null;
  email: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="font-semibold tracking-tight text-slate-900">
            Payroll Portal
          </span>
          <span className="text-slate-300" aria-hidden="true">
            /
          </span>
          <span className="text-sm text-slate-600">
            {membership.company.name}
          </span>

          <div className="ms-auto flex items-center gap-3">
            <RoleBadge role={membership.role} />
            <span className="hidden text-sm text-slate-500 sm:inline">
              {profile?.fullName || email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <SideNav groups={navGroupsFor(membership.role)} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

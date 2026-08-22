import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type {
  ActiveMembership,
  AppRole,
  AuthContext,
  Profile,
} from "@/types/app";

// Postgres "relation does not exist". The membership tables are still being
// built, so until the first migration lands a signed-in user simply has no
// membership rather than the whole app failing to render.
const UNDEFINED_TABLE = "42P01";

export function roleHome(role: AppRole): string {
  switch (role) {
    case "employee":
      return "/employee";
    case "manager":
      return "/manager";
    case "bookkeeper":
      return "/bookkeeper";
  }
}

/**
 * Resolves the signed-in user, their profile, and their active memberships.
 *
 * Wrapped in React's `cache` so several layouts calling it during one render
 * share a single round trip. Returns null when nobody is signed in.
 */
export const getContext = cache(async (): Promise<AuthContext | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile, memberships] = await Promise.all([
    loadProfile(supabase, user.id),
    loadMemberships(supabase, user.id),
  ]);

  return {
    userId: user.id,
    email: user.email ?? profile?.email ?? "",
    profile,
    memberships,
    membership: memberships[0] ?? null,
  };
});

export async function requireContext(): Promise<AuthContext> {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function requireMembership(): Promise<
  AuthContext & { membership: ActiveMembership }
> {
  const ctx = await requireContext();
  if (!ctx.membership) redirect("/no-access");
  return { ...ctx, membership: ctx.membership };
}

/**
 * Layout-level guard. Redirects rather than throwing, because a user landing on
 * a page their role cannot see is a navigation mistake, not an error worth an
 * error boundary. Authorization itself is enforced by RLS; this is UX.
 */
export async function requireRole(
  roles: AppRole[],
): Promise<AuthContext & { membership: ActiveMembership }> {
  const ctx = await requireMembership();
  if (!roles.includes(ctx.membership.role)) {
    redirect(roleHome(ctx.membership.role));
  }
  return ctx;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function loadProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, locale")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (error.code === UNDEFINED_TABLE) return null;
    throw error;
  }
  if (!data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    locale: data.locale,
  };
}

async function loadMemberships(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActiveMembership[]> {
  const { data, error } = await supabase
    .from("memberships")
    .select("id, role, companies(id, name)")
    .eq("profile_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === UNDEFINED_TABLE) return [];
    throw error;
  }

  return (data ?? []).flatMap((row): ActiveMembership[] => {
    const company = Array.isArray(row.companies) ? row.companies[0] : row.companies;
    if (!company) return [];
    return [
      {
        id: row.id,
        role: row.role as AppRole,
        company: { id: company.id, name: company.name },
      },
    ];
  });
}

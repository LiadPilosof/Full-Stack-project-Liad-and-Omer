import { redirect } from "next/navigation";

import { getContext, roleHome } from "@/lib/auth/context";

export default async function Home() {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  if (!ctx.membership) redirect("/no-access");
  redirect(roleHome(ctx.membership.role));
}

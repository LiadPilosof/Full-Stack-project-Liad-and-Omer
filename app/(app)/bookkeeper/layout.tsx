import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth/context";

export default async function BookkeeperLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole(["bookkeeper"]);
  return <>{children}</>;
}

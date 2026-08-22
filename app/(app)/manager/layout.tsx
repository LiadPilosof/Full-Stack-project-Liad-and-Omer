import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth/context";

// Bookkeepers are excluded on purpose: the permission matrix gives them company
// data but not leave approval, so this section would render empty for them.
export default async function ManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole(["manager"]);
  return <>{children}</>;
}

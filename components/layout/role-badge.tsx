import type { AppRole } from "@/types/app";

const LABELS: Record<AppRole, string> = {
  employee: "Employee",
  manager: "Manager",
  bookkeeper: "Bookkeeper",
};

const STYLES: Record<AppRole, string> = {
  employee: "bg-slate-100 text-slate-700",
  manager: "bg-blue-50 text-blue-700",
  bookkeeper: "bg-emerald-50 text-emerald-700",
};

export function RoleBadge({ role }: { role: AppRole }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[role]}`}
    >
      {LABELS[role]}
    </span>
  );
}

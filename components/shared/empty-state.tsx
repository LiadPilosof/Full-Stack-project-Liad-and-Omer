import type { ReactNode } from "react";

/**
 * Empty states always name the reason or the next step. A blank panel reads as
 * a broken page, which matters most on a new employee's first login.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

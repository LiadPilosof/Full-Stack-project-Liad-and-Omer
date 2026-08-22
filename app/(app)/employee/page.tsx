import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { requireMembership } from "@/lib/auth/context";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function EmployeeDashboardPage() {
  const ctx = await requireMembership();
  const firstName = ctx.profile?.fullName?.split(" ")[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Hello, ${firstName}` : "Your dashboard"}
        description="Your pay, your deductions, and your leave balance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Latest net pay" value="—" hint="No pay slips yet" />
        <StatCard label="Average net (12mo)" value="—" hint="Needs 3 months" />
        <StatCard label="Deduction rate" value="—" hint="No pay slips yet" />
        <StatCard label="Vacation available" value="—" hint="Not set up yet" />
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="text-sm font-medium text-slate-900">Recent pay slips</h2>
        <EmptyState
          title="No pay slips yet"
          description="Your first pay slip will appear here once your bookkeeper publishes it."
        />
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="text-sm font-medium text-slate-900">Leave balance</h2>
        <EmptyState
          title="No leave types configured"
          description="Once your bookkeeper sets up leave entitlements, your balance and request history show up here."
        />
      </div>
    </>
  );
}

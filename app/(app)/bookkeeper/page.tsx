import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";

export const metadata: Metadata = {
  title: "What needs attention",
};

export default function BookkeeperDashboardPage() {
  return (
    <>
      <PageHeader
        title="What needs attention"
        description="Everything unfinished, in one list."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Awaiting assignment"
          value="0"
          hint="Uploaded pay slips with no employee"
        />
        <StatCard
          label="Unpublished periods"
          value="0"
          hint="Nothing in draft"
        />
        <StatCard
          label="Missing entitlements"
          value="0"
          hint="Employees without leave days"
        />
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="text-sm font-medium text-slate-900">Your queue</h2>
        <EmptyState
          title="Nothing to do yet"
          description="Create a payroll period and upload pay slips to get started. Nothing becomes visible to employees until you publish the period."
        />
      </div>
    </>
  );
}

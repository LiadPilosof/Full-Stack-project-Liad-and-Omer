import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";

export const metadata: Metadata = {
  title: "Team overview",
};

export default function ManagerOverviewPage() {
  return (
    <>
      <PageHeader
        title="Team overview"
        description="Requests waiting on you, and who is away."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Waiting on you" value="0" hint="Nothing to approve" />
        <StatCard label="Direct reports" value="—" hint="No team data yet" />
        <StatCard label="Away this month" value="—" hint="No leave data yet" />
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="text-sm font-medium text-slate-900">
          Pending approvals
        </h2>
        <EmptyState
          title="Nothing is waiting on you"
          description="Time-off requests from your direct reports appear here, with a warning when someone else on the team is already away on those dates."
        />
      </div>
    </>
  );
}

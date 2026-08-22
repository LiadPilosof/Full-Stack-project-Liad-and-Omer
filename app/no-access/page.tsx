import type { Metadata } from "next";

import { requireContext } from "@/lib/auth/context";

export const metadata: Metadata = {
  title: "No access yet",
};

export default async function NoAccessPage() {
  const ctx = await requireContext();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-base font-medium text-slate-900">
          You are signed in, but not attached to a company yet
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Your account{" "}
          <span className="font-medium text-slate-900">{ctx.email}</span> has no
          active membership, so there is nothing to show you. Ask your
          bookkeeper to add you to their company.
        </p>
        <form action="/auth/signout" method="post" className="mt-6">
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { getContext, roleHome } from "@/lib/auth/context";

export default async function Home() {
  const ctx = await getContext();
  if (ctx) {
    redirect(ctx.membership ? roleHome(ctx.membership.role) : "/no-access");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" dir="ltr">
      {/* Navbar */}
      <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-slate-800 text-lg">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              $
            </div>
            <span>SMB Payroll & Multi-Business Portal</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg font-semibold text-sm transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup/bookkeeper"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition"
            >
              Register Company
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-3xl w-full text-center py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-6">
            ✨ Company-Centric Multi-Business & Payroll Platform
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            Manage your businesses, <br className="hidden sm:inline" />
            <span className="text-indigo-600">payroll, and team invitations</span>
          </h1>

          <p className="max-w-2xl mx-auto text-slate-600 text-base sm:text-lg mb-10 leading-relaxed">
            Booking & bookkeeping companies can register an account to create client businesses,
            upload pay slips, and generate secure role-based invitation links for employees and managers.
          </p>

          {/* Primary Action Card */}
          <div className="max-w-xl mx-auto space-y-4 text-left">
            <div className="p-8 rounded-2xl bg-white border-2 border-indigo-600 shadow-md">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl mb-4">
                🏢
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Booking / Bookkeeping Company
              </h2>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Register your company account to start adding client businesses, publishing payroll, and sending invitation links to employees and managers.
              </p>
              <Link
                href="/signup/bookkeeper"
                className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition gap-2 shadow-sm"
              >
                <span>Register Company Account</span>
                <span>→</span>
              </Link>
            </div>

            {/* Worker Info Callout */}
            <div className="p-5 rounded-xl border border-slate-200 bg-white/70 text-slate-600 text-xs flex items-start gap-3">
              <span className="text-lg">✉️</span>
              <div>
                <strong className="text-slate-800 font-semibold block mb-0.5">
                  Are you an Employee or Team Manager?
                </strong>
                <span>
                  Worker and manager accounts are invitation-only. Please open the unique invitation link provided by your company administrator to join your company.
                </span>
              </div>
            </div>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} SMB Payroll & Multi-Business Portal. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/signup/bookkeeper" className="hover:text-indigo-600 transition">
              Company Registration
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

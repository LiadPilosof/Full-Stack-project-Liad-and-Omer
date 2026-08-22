import Link from "next/link";

export default function SignupHubPage() {
  return (
    <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          Create an Account
        </h1>
        <p className="text-slate-600 text-sm sm:text-base">
          Choose the account type that best matches your role to get started
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Bookkeeper Card */}
        <Link
          href="/signup/bookkeeper"
          className="group relative flex flex-col justify-between p-6 border-2 border-slate-200 hover:border-indigo-600 rounded-xl bg-white hover:bg-indigo-50/30 transition shadow-sm hover:shadow-md text-left"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition">
              📊
            </div>
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 mb-2">
              Bookkeeping / Business
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
              For external bookkeepers, payroll accountants, and business owners managing company pay slips, leave balances, and employee documents.
            </p>
          </div>
          <div className="flex items-center text-sm font-semibold text-indigo-600 gap-1 mt-2">
            <span>Register as Bookkeeper</span>
            <span className="text-lg">→</span>
          </div>
        </Link>

        {/* Worker / Manager Card */}
        <Link
          href="/signup/worker"
          className="group relative flex flex-col justify-between p-6 border-2 border-slate-200 hover:border-emerald-600 rounded-xl bg-white hover:bg-emerald-50/30 transition shadow-sm hover:shadow-md text-left"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition">
              👤
            </div>
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 mb-2">
              Worker / Team Manager
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
              For workers and team managers wanting to view pay slips, track leave balances, and submit or approve time-off requests.
            </p>
          </div>
          <div className="flex items-center text-sm font-semibold text-emerald-600 gap-1 mt-2">
            <span>Register as Worker / Manager</span>
            <span className="text-lg">→</span>
          </div>
        </Link>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
        Secure authentication powered by Supabase. Your role and permissions are safely managed.
      </div>
    </div>
  );
}

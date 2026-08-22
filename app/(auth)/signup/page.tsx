import Link from "next/link";

export default function SignupHubPage() {
  return (
    <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-sm text-left">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl mx-auto mb-3">
          🏢
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          Company Registration
        </h1>
        <p className="text-slate-600 text-sm">
          Register your booking or bookkeeping company account to manage businesses and employee payroll.
        </p>
      </div>

      <div className="space-y-4">
        {/* Company Registration Card */}
        <div className="p-6 border-2 border-indigo-600 bg-indigo-50/40 rounded-xl">
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            New Company Account
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
            For booking firms, bookkeeping agencies, and business administrators to set up an account, add client businesses, and generate employee/manager invite links.
          </p>
          <Link
            href="/signup/bookkeeper"
            className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm transition shadow-sm"
          >
            Register Company Account →
          </Link>
        </div>

        {/* Worker Notice */}
        <div className="p-5 border border-slate-200 bg-slate-50/60 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-xl">✉️</span>
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Are you an Employee or Team Manager?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Worker and manager accounts cannot be created publicly. You must use the <strong>invitation link</strong> provided by your company administrator to join.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

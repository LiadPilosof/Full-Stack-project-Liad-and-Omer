import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" dir="ltr">
      {/* Navbar */}
      <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-slate-800 text-lg">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              $
            </div>
            <span>SMB Payroll & Bookkeeping Portal</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/signup"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full text-center py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-6">
            ✨ Smart Payroll, Pay Slips & Leave Management
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            Modern payroll and leave portal, <br className="hidden sm:inline" />
            <span className="text-indigo-600">built for the entire team</span>
          </h1>

          <p className="max-w-2xl mx-auto text-slate-600 text-base sm:text-lg mb-10 leading-relaxed">
            A unified portal allowing bookkeepers to manage pay slips and leave entitlements,
            while workers and managers can view pay metrics and submit or approve time-off requests.
          </p>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto text-left">
            {/* Bookkeeper Box */}
            <div className="p-6 rounded-2xl bg-white border-2 border-indigo-100 hover:border-indigo-500 shadow-sm hover:shadow-md transition group">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl mb-4 group-hover:bg-indigo-600 group-hover:text-white transition">
                📊
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Bookkeeping & Businesses
              </h2>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Register as an external bookkeeper or business owner to upload pay slips, manage leave policies, and publish payroll periods.
              </p>
              <Link
                href="/signup/bookkeeper"
                className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition gap-1"
              >
                <span>Register as Bookkeeper</span>
                <span>→</span>
              </Link>
            </div>

            {/* Worker Box */}
            <div className="p-6 rounded-2xl bg-white border-2 border-emerald-100 hover:border-emerald-500 shadow-sm hover:shadow-md transition group">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl mb-4 group-hover:bg-emerald-600 group-hover:text-white transition">
                👤
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Workers & Team Managers
              </h2>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Sign up as an employee or team manager to access your pay slip history, track leave balances, and manage time-off requests.
              </p>
              <Link
                href="/signup/worker"
                className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition gap-1"
              >
                <span>Register as Worker / Manager</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} Payroll & Bookkeeping Portal. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/signup" className="hover:text-indigo-600 transition">
              Sign Up Hub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

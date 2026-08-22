"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function WorkerSignupPage() {
  const [inviteToken, setInviteToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) {
      setError("Please enter the invitation token or paste the invite link from your company.");
      return;
    }

    // If user pasted a full URL (e.g. http://localhost:3000/invite/token123), extract the token
    const cleanToken = inviteToken.trim().split("/").pop() || "";
    router.push(`/invite/${cleanToken}`);
  };

  return (
    <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm text-left">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl mx-auto mb-3">
          ✉️
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
          Worker & Manager Registration
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed">
          Worker and Manager accounts are <strong>invitation-based</strong> to guarantee secure role assignment and company scoping.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleContinue} className="space-y-4">
        <div>
          <label htmlFor="inviteToken" className="block text-xs font-semibold text-slate-700 mb-1">
            Enter Invitation Code or Link
          </label>
          <input
            id="inviteToken"
            type="text"
            required
            value={inviteToken}
            onChange={(e) => {
              setInviteToken(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. a7f8e91b... or paste full invite URL"
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-emerald-100 focus:outline-none focus:ring-2 transition"
          />
          <p className="text-xs text-slate-500 mt-1.5">
            Your company administrator or bookkeeper can generate an invitation link for your role.
          </p>
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer text-sm"
        >
          <span>Continue with Invitation</span>
          <span>→</span>
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
        <div>
          Are you a Bookkeeping Firm?{" "}
          <Link href="/signup/bookkeeper" className="text-indigo-600 font-bold hover:underline">
            Register Firm
          </Link>
        </div>
        <Link href="/" className="text-slate-500 hover:underline">
          Home
        </Link>
      </div>
    </div>
  );
}

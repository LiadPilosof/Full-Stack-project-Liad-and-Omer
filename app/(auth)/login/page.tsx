import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

const CALLBACK_ERRORS: Record<string, string> = {
  invalid_link: "That sign-in link has expired or was already used.",
  missing_code: "That sign-in link was incomplete. Request a new one.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-xl font-bold text-slate-900">Sign in</h1>
      <p className="mt-1 text-sm text-slate-500">
        We will email you a link that signs you in. No password needed.
      </p>

      {error && CALLBACK_ERRORS[error] && (
        <p
          role="alert"
          className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          {CALLBACK_ERRORS[error]}
        </p>
      )}

      <LoginForm next={next} />

      <p className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
        Do not have an account yet?{" "}
        <Link
          href="/signup"
          className="font-semibold text-indigo-600 hover:text-indigo-700"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}

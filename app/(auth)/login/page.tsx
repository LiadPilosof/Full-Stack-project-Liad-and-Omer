import type { Metadata } from "next";

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
    <>
      <h2 className="text-base font-medium text-slate-900">Sign in</h2>
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
    </>
  );
}

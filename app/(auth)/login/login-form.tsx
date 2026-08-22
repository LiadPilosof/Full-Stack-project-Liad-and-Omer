"use client";

import { useActionState } from "react";

import { sendMagicLink } from "@/lib/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, submit, pending] = useActionState(sendMagicLink, null);
  const fieldError = state?.ok === false ? state.fieldErrors?.email?.[0] : undefined;
  const formError =
    state?.ok === false && !fieldError ? state.error : undefined;

  return (
    <form action={submit} className="mt-6 space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700"
        >
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "email-error" : undefined}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50"
          placeholder="you@company.co.il"
          disabled={pending}
        />
        {fieldError && (
          <p id="email-error" className="mt-1 text-sm text-red-600">
            {fieldError}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-60"
      >
        {pending ? "Sending link…" : "Email me a sign-in link"}
      </button>

      <p className="text-xs text-slate-500">
        Accounts are created by your bookkeeper. If your address is not
        registered yet, ask them to invite you.
      </p>
    </form>
  );
}

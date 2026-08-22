import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Check your email",
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-xl font-bold text-slate-900">Check your email</h1>
      <p className="mt-2 text-sm text-slate-600">
        {email ? (
          <>
            If <span className="font-medium text-slate-900">{email}</span> is
            registered, a sign-in link is on its way.
          </>
        ) : (
          <>If that address is registered, a sign-in link is on its way.</>
        )}
      </p>
      <p className="mt-4 text-sm text-slate-500">
        The link works once and expires after an hour. You can close this tab
        and open the link on any device.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-block text-sm font-semibold text-indigo-600 underline underline-offset-4 hover:text-indigo-700"
      >
        Use a different address
      </Link>
    </div>
  );
}

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
    <>
      <h2 className="text-base font-medium text-slate-900">Check your email</h2>
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
        className="mt-6 inline-block text-sm font-medium text-slate-900 underline underline-offset-4"
      >
        Use a different address
      </Link>
    </>
  );
}

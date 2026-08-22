"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  bookkeeperSignupSchema,
  type BookkeeperSignupInput,
} from "@/lib/validations/auth";

export default function BookkeeperSignupPage() {
  const [formData, setFormData] = useState<BookkeeperSignupInput>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    companyName: "",
    taxId: "",
    terms: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const supabase = createClient();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error for field when user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    // Validate with Zod
    const validationResult = bookkeeperSignupSchema.safeParse(formData);
    if (!validationResult.success) {
      const formattedErrors: Record<string, string> = {};
      for (const issue of validationResult.error.issues) {
        const path = issue.path[0] as string;
        if (path && !formattedErrors[path]) {
          formattedErrors[path] = issue.message;
        }
      }
      setFieldErrors(formattedErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            phone: formData.phone?.trim() || null,
            company_name: formData.companyName.trim(),
            tax_id: formData.taxId.trim(),
            signup_type: "bookkeeper",
            role: "bookkeeper",
          },
        },
      });

      if (error) {
        setGeneralError(
          error.message === "User already registered"
            ? "A user with this email address is already registered."
            : `Registration error: ${error.message}`,
        );
        return;
      }

      if (data?.user) {
        setIsSuccess(true);
      }
    } catch (err: unknown) {
      setGeneralError("An unexpected error occurred during signup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Account Created Successfully!
        </h2>
        <p className="text-slate-600 text-sm sm:text-base mb-6 leading-relaxed">
          We have registered your Bookkeeper account and company{" "}
          <strong className="text-slate-800">{formData.companyName}</strong> (Tax ID:{" "}
          {formData.taxId}).
          <br className="my-2" />
          A confirmation link has been sent to{" "}
          <span className="font-semibold text-slate-900">{formData.email}</span>. Please verify your email to continue.
        </p>
        <div className="flex justify-center">
          <Link
            href="/"
            className="inline-flex justify-center items-center px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm text-left">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <div>
          <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 mb-2">
            Bookkeeping / Business
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Bookkeeper Registration
          </h1>
        </div>
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl">
          📊
        </div>
      </div>

      {generalError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div className="flex-1">{generalError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Contact Details Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-1">
            Personal & Contact Details
          </h2>

          <div>
            <label
              htmlFor="fullName"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Jane Doe"
              className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                fieldErrors.fullName
                  ? "border-red-400 focus:ring-red-200"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
              } focus:outline-none focus:ring-2 transition`}
            />
            {fieldErrors.fullName && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.fullName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="jane@company.com"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                  fieldErrors.email
                    ? "border-red-400 focus:ring-red-200"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                } focus:outline-none focus:ring-2 transition`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Phone Number (Optional)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="050-1234567"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                  fieldErrors.phone
                    ? "border-red-400 focus:ring-red-200"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                } focus:outline-none focus:ring-2 transition`}
              />
              {fieldErrors.phone && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                  fieldErrors.password
                    ? "border-red-400 focus:ring-red-200"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                } focus:outline-none focus:ring-2 transition`}
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                  fieldErrors.confirmPassword
                    ? "border-red-400 focus:ring-red-200"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                } focus:outline-none focus:ring-2 transition`}
              />
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Company Details Section */}
        <div className="space-y-4 pt-2">
          <h2 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-1">
            Company & Business Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="companyName"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Company / Practice Name <span className="text-red-500">*</span>
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                value={formData.companyName}
                onChange={handleChange}
                placeholder="e.g. Acme Corp Ltd."
                className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                  fieldErrors.companyName
                    ? "border-red-400 focus:ring-red-200"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                } focus:outline-none focus:ring-2 transition`}
              />
              {fieldErrors.companyName && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.companyName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="taxId"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Tax ID / Business Number <span className="text-red-500">*</span>
              </label>
              <input
                id="taxId"
                name="taxId"
                type="text"
                required
                value={formData.taxId}
                onChange={handleChange}
                placeholder="e.g. 512345678"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                  fieldErrors.taxId
                    ? "border-red-400 focus:ring-red-200"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                } focus:outline-none focus:ring-2 transition`}
              />
              {fieldErrors.taxId && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.taxId}</p>
              )}
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="pt-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="terms"
              checked={formData.terms}
              onChange={handleChange}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-600 leading-tight">
              I agree to the <span className="text-indigo-600 underline">Terms of Service</span> and <span className="text-indigo-600 underline">Privacy Policy</span>.
            </span>
          </label>
          {fieldErrors.terms && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.terms}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Creating Bookkeeper Account...</span>
              </>
            ) : (
              <span>Create Bookkeeper Account</span>
            )}
          </button>
        </div>
      </form>

      {/* Switcher link */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
        <div>
          Signing up as an employee or manager?{" "}
          <Link
            href="/signup/worker"
            className="text-emerald-600 font-bold hover:underline"
          >
            Switch to Worker Signup
          </Link>
        </div>
      </div>
    </div>
  );
}

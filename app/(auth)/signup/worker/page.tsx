"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  workerSignupSchema,
  type WorkerSignupInput,
} from "@/lib/validations/auth";

export default function WorkerSignupPage() {
  const [formData, setFormData] = useState<WorkerSignupInput>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    companyTaxId: "",
    role: "employee",
    jobTitle: "",
    department: "",
    employeeNumber: "",
    terms: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const supabase = createClient();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const target = e.target;
    const name = target.name;
    const value =
      target.type === "checkbox"
        ? (target as HTMLInputElement).checked
        : target.value;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleRoleSelect = (role: "employee" | "manager") => {
    setFormData((prev) => ({ ...prev, role }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    const validationResult = workerSignupSchema.safeParse(formData);
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
            company_tax_id: formData.companyTaxId.trim(),
            signup_type: "worker",
            role: formData.role, // 'employee' or 'manager'
            job_title: formData.jobTitle?.trim() || null,
            department: formData.department?.trim() || null,
            employee_number: formData.employeeNumber?.trim() || null,
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
    const isManager = formData.role === "manager";
    return (
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {isManager ? "Manager Account Registered!" : "Worker Account Registered!"}
        </h2>
        <p className="text-slate-600 text-sm sm:text-base mb-6 leading-relaxed">
          We have sent a verification email to{" "}
          <strong className="text-slate-800">{formData.email}</strong>.
          <br className="my-2" />
          {isManager ? (
            <span>
              Once verified, you will be able to access your personal pay slips, leave balances, and team time-off approvals.
            </span>
          ) : (
            <span>
              Once verified, you will be able to access your pay slips, leave balance tracking, and time-off request forms.
            </span>
          )}
        </p>
        <div className="flex justify-center">
          <Link
            href="/"
            className="inline-flex justify-center items-center px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
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
          <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 mb-2">
            Worker & Manager Portal
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Worker / Manager Registration
          </h1>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
          👤
        </div>
      </div>

      {generalError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div className="flex-1">{generalError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Role Choice (Worker vs Manager) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Select Your Role in the Company <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleRoleSelect("employee")}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                formData.role === "employee"
                  ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-100 text-emerald-950 font-bold"
                  : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-sm font-bold">Worker (Employee)</span>
                <span className="text-base">👤</span>
              </div>
              <span className="text-xs text-slate-500 font-normal">
                View pay slips, leave balances, and submit requests
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect("manager")}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                formData.role === "manager"
                  ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-100 text-emerald-950 font-bold"
                  : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-sm font-bold">Team Manager</span>
                <span className="text-base">👔</span>
              </div>
              <span className="text-xs text-slate-500 font-normal">
                Worker portal + review & approve team leave requests
              </span>
            </button>
          </div>
        </div>

        {/* Personal Details */}
        <div className="space-y-4 pt-2">
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
              placeholder="e.g. John Smith"
              className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                fieldErrors.fullName
                  ? "border-red-400 focus:ring-red-200"
                  : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"
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
                placeholder="john@company.com"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                  fieldErrors.email
                    ? "border-red-400 focus:ring-red-200"
                    : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"
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
                    : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"
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
                    : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"
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
                    : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"
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

        {/* Company Association */}
        <div className="space-y-4 pt-2">
          <h2 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-1">
            Company Association
          </h2>

          <div>
            <label
              htmlFor="companyTaxId"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Company Tax ID / Business Number <span className="text-red-500">*</span>
            </label>
            <input
              id="companyTaxId"
              name="companyTaxId"
              type="text"
              required
              value={formData.companyTaxId}
              onChange={handleChange}
              placeholder="e.g. 512345678"
              className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                fieldErrors.companyTaxId
                  ? "border-red-400 focus:ring-red-200"
                  : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-100"
              } focus:outline-none focus:ring-2 transition`}
            />
            {fieldErrors.companyTaxId && (
              <p className="text-xs text-red-600 mt-1">
                {fieldErrors.companyTaxId}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Used to associate your account with your employer's payroll workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="department"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Department / Team (Optional)
              </label>
              <input
                id="department"
                name="department"
                type="text"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Engineering, Sales"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-emerald-100 focus:outline-none focus:ring-2 transition"
              />
            </div>

            <div>
              <label
                htmlFor="jobTitle"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Job Title (Optional)
              </label>
              <input
                id="jobTitle"
                name="jobTitle"
                type="text"
                value={formData.jobTitle}
                onChange={handleChange}
                placeholder="e.g. Software Engineer"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-emerald-100 focus:outline-none focus:ring-2 transition"
              />
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
              className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs text-slate-600 leading-tight">
              I agree to the <span className="text-emerald-600 underline">Terms of Service</span> and <span className="text-emerald-600 underline">Privacy Policy</span>.
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
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
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
                <span>Creating {formData.role === "manager" ? "Manager" : "Worker"} Account...</span>
              </>
            ) : (
              <span>
                Create {formData.role === "manager" ? "Team Manager" : "Worker"} Account
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Switcher link */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
        <div>
          Registering a company or accounting practice?{" "}
          <Link
            href="/signup/bookkeeper"
            className="text-indigo-600 font-bold hover:underline"
          >
            Switch to Bookkeeper Signup
          </Link>
        </div>
      </div>
    </div>
  );
}

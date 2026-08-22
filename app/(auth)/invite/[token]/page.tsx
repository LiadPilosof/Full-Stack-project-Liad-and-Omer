"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getInvitationDetails } from "@/lib/actions/invitations";
import { inviteSignupSchema, type InviteSignupInput } from "@/lib/validations/auth";

export default function InviteSignupPage() {
  const params = useParams();
  const token = params?.token as string;

  const [invitationInfo, setInvitationInfo] = useState<{
    companyName: string;
    role: "employee" | "manager";
    email?: string | null;
  } | null>(null);

  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<InviteSignupInput, "token">>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    jobTitle: "",
    department: "",
    terms: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function loadInvite() {
      if (!token) return;
      setLoadingInvite(true);
      const res = await getInvitationDetails(token);
      if (!res.ok || !res.data) {
        setInviteError(res.error || "Invalid invitation link");
      } else {
        setInvitationInfo(res.data);
        if (res.data.email) {
          setFormData((prev) => ({ ...prev, email: res.data.email || "" }));
        }
      }
      setLoadingInvite(false);
    }
    loadInvite();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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

    const validationResult = inviteSignupSchema.safeParse({
      ...formData,
      token,
    });

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
            job_title: formData.jobTitle?.trim() || null,
            department: formData.department?.trim() || null,
            invitation_token: token,
            signup_type: "worker",
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

  if (loadingInvite) {
    return (
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center">
        <div className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4 border-4 border-indigo-600 border-t-transparent rounded-full" />
        <p className="text-slate-600 font-medium">Validating invitation link...</p>
      </div>
    );
  }

  if (inviteError || !invitationInfo) {
    return (
      <div className="w-full max-w-lg bg-white border border-red-200 rounded-2xl p-8 shadow-sm text-center">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
          ✕
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Invitation</h2>
        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          {inviteError || "This invitation link is invalid or has expired."}
        </p>
        <Link
          href="/"
          className="inline-flex justify-center items-center px-5 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition text-sm"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  const isManager = invitationInfo.role === "manager";

  if (isSuccess) {
    return (
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-sm text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Welcome to {invitationInfo.companyName}!
        </h2>
        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          Your account has been created with the role of{" "}
          <strong className="text-slate-900">
            {isManager ? "Team Manager" : "Regular Employee"}
          </strong>.
          <br className="my-2" />
          A verification link has been sent to{" "}
          <span className="font-semibold text-slate-900">{formData.email}</span>.
        </p>
        <Link
          href="/"
          className="inline-flex justify-center items-center px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition text-sm"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm text-left">
      {/* Header with Invited Business & Role badge */}
      <div className="border-b border-slate-100 pb-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
            isManager
              ? "bg-amber-100 text-amber-800"
              : "bg-emerald-100 text-emerald-800"
          }`}>
            {isManager ? "👔 Manager Invitation" : "👤 Employee Invitation"}
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Join {invitationInfo.companyName}
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm mt-1">
          You have been invited to join as a{" "}
          <strong className="text-slate-800">
            {isManager ? "Team Manager" : "Regular Employee"}
          </strong>. Fill out your details below to activate your account.
        </p>
      </div>

      {generalError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div className="flex-1">{generalError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 mb-1">
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

        {/* Email & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              disabled={Boolean(invitationInfo.email)}
              value={formData.email}
              onChange={handleChange}
              placeholder="jane@example.com"
              className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                fieldErrors.email
                  ? "border-red-400 focus:ring-red-200"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
              } disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 transition`}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 mb-1">
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

        {/* Password & Confirm */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
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
              <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 mb-1">
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
              <p className="text-xs text-red-600 mt-1">{fieldErrors.confirmPassword}</p>
            )}
          </div>
        </div>

        {/* Optional Department & Title */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label htmlFor="department" className="block text-xs font-semibold text-slate-700 mb-1">
              Department / Team (Optional)
            </label>
            <input
              id="department"
              name="department"
              type="text"
              value={formData.department}
              onChange={handleChange}
              placeholder="e.g. Sales, Operations"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-indigo-100 focus:outline-none focus:ring-2 transition"
            />
          </div>

          <div>
            <label htmlFor="jobTitle" className="block text-xs font-semibold text-slate-700 mb-1">
              Job Title (Optional)
            </label>
            <input
              id="jobTitle"
              name="jobTitle"
              type="text"
              value={formData.jobTitle}
              onChange={handleChange}
              placeholder="e.g. Account Executive"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-indigo-100 focus:outline-none focus:ring-2 transition"
            />
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

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 px-4 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed ${
              isManager
                ? "bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300"
                : "bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300"
            }`}
          >
            {isSubmitting ? (
              <span>Activating Account...</span>
            ) : (
              <span>Join {invitationInfo.companyName} as {isManager ? "Manager" : "Employee"}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}


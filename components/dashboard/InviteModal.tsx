"use client";

import { useState, useEffect } from "react";
import {
  createInvitationLink,
  listBusinessInvitations,
} from "@/lib/actions/invitations";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: {
    id: string;
    name: string;
  } | null;
}

export function InviteModal({ isOpen, onClose, business }: InviteModalProps) {
  const [role, setRole] = useState<"employee" | "manager">("employee");
  const [email, setEmail] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  useEffect(() => {
    if (isOpen && business?.id) {
      setGeneratedLink(null);
      setCopied(false);
      setError(null);
      loadInvitations(business.id);
    }
  }, [isOpen, business]);

  async function loadInvitations(companyId: string) {
    setLoadingInvites(true);
    const res = await listBusinessInvitations(companyId);
    if (res.ok && res.data) {
      setInvitations(res.data);
    }
    setLoadingInvites(false);
  }

  if (!isOpen || !business) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsGenerating(true);
    setCopied(false);

    try {
      const res = await createInvitationLink({
        companyId: business.id,
        role,
        email: email.trim() || undefined,
        expiresInDays,
      });

      if (!res.ok || !res.data) {
        setError(res.error || "Failed to generate invitation link.");
      } else {
        const fullUrl = `${window.location.origin}${res.data.inviteUrl}`;
        setGeneratedLink(fullUrl);
        setEmail("");
        loadInvitations(business.id);
      }
    } catch {
      setError("An error occurred while generating invitation link.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (linkToCopy?: string) => {
    const text = linkToCopy || generatedLink;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 text-left max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">✉️</span>
              <h2 className="text-xl font-bold text-slate-900">
                Invite Team Members
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Generating invitation links for <strong>{business.name}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition text-lg"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Generate Link Form */}
        <form onSubmit={handleGenerate} className="space-y-4 mb-6">
          {/* Role Choice */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Assigned Role <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("employee")}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                  role === "employee"
                    ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-200"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="text-xl">👤</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">Regular Employee</div>
                  <div className="text-[11px] text-slate-500 leading-tight">
                    View payslips & submit leave requests
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole("manager")}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                  role === "manager"
                    ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-200"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="text-xl">👔</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">Team Manager</div>
                  <div className="text-[11px] text-slate-500 leading-tight">
                    Approve time-off & manage team
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Optional Email & Expiration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Restrict to Email (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. worker@example.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Link Expiration
              </label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 outline-none transition bg-white"
              >
                <option value={3}>3 Days</option>
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isGenerating ? "Generating..." : "Generate Invitation Link"}
          </button>
        </form>

        {/* Generated Link Alert */}
        {generatedLink && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 mb-6 animate-in fade-in">
            <div className="text-xs font-bold text-emerald-900 mb-1">
              ✓ Invitation Link Ready:
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg text-slate-700 select-all font-mono"
              />
              <button
                type="button"
                onClick={() => handleCopy()}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer"
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
            <p className="text-[11px] text-emerald-800 mt-2">
              Send this link to the {role === "manager" ? "manager" : "worker"}. When they open it, their account will automatically be created under <strong>{business.name}</strong>.
            </p>
          </div>
        )}

        {/* Previous Invitations */}
        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
            Active & Past Invitations
          </h3>

          {loadingInvites ? (
            <p className="text-xs text-slate-400">Loading invitations...</p>
          ) : invitations.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No invitation links generated yet.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {invitations.map((inv) => {
                const isUsed = Boolean(inv.used_at);
                const isExpired = !isUsed && new Date(inv.expires_at) < new Date();
                const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/invite/${inv.token}` : `/invite/${inv.token}`;

                return (
                  <div
                    key={inv.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inv.role === "manager"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {inv.role === "manager" ? "Manager" : "Employee"}
                      </span>
                      {inv.email && (
                        <span className="text-slate-600 text-[11px]">({inv.email})</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isUsed ? (
                        <span className="text-emerald-600 font-semibold text-[11px]">Accepted ✓</span>
                      ) : isExpired ? (
                        <span className="text-red-500 text-[11px]">Expired</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCopy(inviteUrl)}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] hover:underline cursor-pointer"
                        >
                          Copy Link
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


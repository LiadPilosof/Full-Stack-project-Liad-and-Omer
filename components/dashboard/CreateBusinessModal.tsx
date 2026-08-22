"use client";

import { useState } from "react";
import { createBusiness } from "@/lib/actions/businesses";

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateBusinessModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateBusinessModalProps) {
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [managersCanViewPayslips, setManagersCanViewPayslips] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || name.trim().length < 2) {
      setError("Business name must be at least 2 characters.");
      return;
    }
    if (!taxId.trim() || taxId.trim().length < 5) {
      setError("Business Tax ID must be at least 5 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createBusiness({
        name: name.trim(),
        taxId: taxId.trim(),
        timezone: "Asia/Jerusalem",
        currency: "ILS",
        managersCanViewPayslipFiles: managersCanViewPayslips,
      });

      if (!res.ok) {
        setError(res.error || "Failed to create business.");
      } else {
        setName("");
        setTaxId("");
        setManagersCanViewPayslips(false);
        onSuccess();
        onClose();
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 text-left animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏬</span>
            <h2 className="text-xl font-bold text-slate-900">Create Client Business</h2>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Bakery Ltd"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Business Tax ID / Registration # <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="e.g. 518889991"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            />
          </div>

          <div className="pt-1">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={managersCanViewPayslips}
                onChange={(e) => setManagersCanViewPayslips(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-600 leading-tight">
                Allow team managers in this business to view team payslip PDF files.
              </span>
            </label>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-sm transition cursor-pointer"
            >
              {isSubmitting ? "Creating..." : "Create Business"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


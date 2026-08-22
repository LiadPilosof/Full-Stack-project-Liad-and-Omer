"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getFirmProfile, listFirmBusinesses } from "@/lib/actions/businesses";
import { BusinessCard } from "@/components/dashboard/BusinessCard";
import { CreateBusinessModal } from "@/components/dashboard/CreateBusinessModal";
import { InviteModal } from "@/components/dashboard/InviteModal";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [profileData, setProfileData] = useState<any>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBusinessForInvite, setSelectedBusinessForInvite] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Ensure client session is synced
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please log in to access the dashboard.");
        setLoading(false);
        return;
      }

      const [profileRes, businessesRes] = await Promise.all([
        getFirmProfile(),
        listFirmBusinesses(),
      ]);

      if (!profileRes.ok || !profileRes.data) {
        setError(profileRes.error || "Please log in to access the dashboard.");
      } else {
        setProfileData(profileRes.data);
      }

      if (businessesRes.ok && businessesRes.data) {
        setBusinesses(businessesRes.data);
      }
    } catch {
      setError("Failed to load dashboard data. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [supabase.auth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 text-indigo-600 mx-auto mb-4 border-4 border-indigo-600 border-t-transparent rounded-full" />
          <p className="text-slate-600 text-sm font-medium">Loading your company dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Notice</h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            {error || "Unable to access the company dashboard. Please make sure you are logged in with your bookkeeping firm account."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => loadData()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm transition cursor-pointer"
            >
              Retry
            </button>
            <Link
              href="/signup/bookkeeper"
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm transition"
            >
              Register Firm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { firm, profile } = profileData;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" dir="ltr">
      {/* Top Navbar */}
      <header className="w-full border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              🏢
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                {firm.name}
              </div>
              <div className="text-[11px] text-slate-500">
                Tax ID: {firm.taxId}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold text-slate-800">
                {profile?.full_name || "Administrator"}
              </div>
              <div className="text-[11px] text-slate-500">
                {profile?.email}
              </div>
            </div>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span>
              <span>Create Business</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Banner Section */}
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 text-white rounded-2xl p-6 sm:p-8 shadow-sm mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <span className="inline-block px-2.5 py-0.5 text-[11px] font-bold bg-white/20 text-white rounded-full mb-2">
              Bookkeeping Firm Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Client Businesses & Invitations
            </h1>
            <p className="text-indigo-100 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
              Create client businesses under your firm account, then generate role-based invitation links to onboard workers and team managers.
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="py-3 px-5 bg-white hover:bg-indigo-50 text-indigo-900 font-extrabold rounded-xl text-sm shadow transition flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <span>🏢</span>
            <span>+ Create New Business</span>
          </button>
        </div>

        {/* Business Grid Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Managed Businesses ({businesses.length})
            </h2>
            <p className="text-xs text-slate-500">
              Select a business to invite employees or managers.
            </p>
          </div>
        </div>

        {/* Businesses List / Empty State */}
        {businesses.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl mx-auto mb-4">
              🏬
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              No Client Businesses Yet
            </h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6 leading-relaxed">
              Get started by adding your first client business. Once created, you will be able to generate invite links for its workers and managers.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition inline-flex items-center gap-2 cursor-pointer"
            >
              <span>+ Create Your First Business</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {businesses.map((b) => (
              <BusinessCard
                key={b.id}
                business={b}
                onInvite={(selected) => setSelectedBusinessForInvite(selected)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateBusinessModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadData}
      />

      <InviteModal
        isOpen={Boolean(selectedBusinessForInvite)}
        onClose={() => setSelectedBusinessForInvite(null)}
        business={selectedBusinessForInvite}
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <span>{firm.name} (Firm Account)</span>
          <span>SMB Payroll & Multi-Business Portal</span>
        </div>
      </footer>
    </div>
  );
}

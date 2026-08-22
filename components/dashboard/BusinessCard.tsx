"use client";

interface BusinessCardProps {
  business: {
    id: string;
    name: string;
    taxId: string;
    createdAt: string;
    employeeCount: number;
    invitationCount: number;
  };
  onInvite: (business: { id: string; name: string }) => void;
}

export function BusinessCard({ business, onInvite }: BusinessCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition text-left flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-xl font-bold">
            🏢
          </div>
          <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600 rounded-full">
            Tax ID: {business.taxId}
          </span>
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1">
          {business.name}
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          Created on {new Date(business.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 py-3 px-4 bg-slate-50 rounded-xl mb-5">
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Employees
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              {business.employeeCount}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Pending Invites
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              {business.invitationCount}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onInvite({ id: business.id, name: business.name })}
          className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>✉️</span>
          <span>Invite Team</span>
        </button>
      </div>
    </div>
  );
}


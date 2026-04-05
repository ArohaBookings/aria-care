import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Users, Plus, ArrowRight, AlertCircle } from "lucide-react";
import { formatDate, daysUntil } from "@/lib/utils";
import { SearchInput } from "@/components/dashboard/SearchInput";

export const metadata = { title: "Participants | Aria" };

export default async function ParticipantsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("users").select("organisation_id").eq("id", user!.id).single();
  const orgId = profile?.organisation_id;
  const { q } = await searchParams;

  const { data: allParticipants } = await supabase
    .from("participants")
    .select("id, full_name, ndis_number, plan_end_date, funding_remaining_pct, status, support_category, created_at")
    .eq("organisation_id", orgId)
    .order("full_name");

  const participants = q
    ? (allParticipants ?? []).filter(p => p.full_name.toLowerCase().includes(q.toLowerCase()))
    : allParticipants;

  const active = participants?.filter(p => p.status === "active") ?? [];
  const inactive = participants?.filter(p => p.status !== "active") ?? [];

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Participants</h2>
          <p className="text-sm text-slate-500 mt-0.5">{active.length} active · {inactive.length} inactive</p>
        </div>
        <Link href="/participants/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Add participant
        </Link>
      </div>

      {/* Search bar */}
      <div className="mb-6 max-w-sm">
        <SearchInput placeholder="Search participants..." />
      </div>

      {(!participants || participants.length === 0) ? (
        <div className="card p-16 text-center border-dashed">
          <div className="w-14 h-14 rounded-2xl bg-aria-50 border border-aria-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-aria-400" />
          </div>
          <h3 className="font-display text-lg font-bold text-slate-900 mb-2">No participants yet</h3>
          <p className="text-sm text-slate-500 mb-5">Add your first participant to start generating notes and tracking compliance.</p>
          <Link href="/participants/new" className="btn-primary inline-flex">
            <Plus className="w-4 h-4" /> Add first participant
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Participant</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell">NDIS Number</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Plan Ends</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Funding</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {participants?.map((p) => {
                const days = p.plan_end_date ? daysUntil(p.plan_end_date) : null;
                const planAlert = days !== null && days <= 30;
                const fundingLow = p.funding_remaining_pct !== null && p.funding_remaining_pct <= 20;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-aria-gradient flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {p.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{p.full_name}</p>
                          <p className="text-xs text-slate-500">{p.support_category ?? "Support coordination"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-sm font-mono text-slate-600">{p.ndis_number ?? "—"}</span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      {p.plan_end_date ? (
                        <div className="flex items-center gap-1.5">
                          {planAlert && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                          <span className={`text-sm ${planAlert ? "text-amber-700 font-semibold" : "text-slate-600"}`}>
                            {formatDate(p.plan_end_date)}
                          </span>
                          {planAlert && <span className="text-xs text-amber-600">({days}d)</span>}
                        </div>
                      ) : <span className="text-sm text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      {p.funding_remaining_pct !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${p.funding_remaining_pct > 40 ? "bg-emerald-500" : p.funding_remaining_pct > 20 ? "bg-amber-400" : "bg-red-500"}`}
                              style={{ width: `${p.funding_remaining_pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${fundingLow ? "text-red-600" : "text-slate-600"}`}>{p.funding_remaining_pct}%</span>
                        </div>
                      ) : <span className="text-sm text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={p.status === "active" ? "badge-green" : "badge-slate"}>
                        {p.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/participants/${p.id}`} className="btn-ghost text-xs py-1.5 px-3 opacity-0 group-hover:opacity-100">
                        View <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

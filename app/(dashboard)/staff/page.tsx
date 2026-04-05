import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Users, Plus, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { formatDate, daysUntil } from "@/lib/utils";

export const metadata = { title: "Staff | Aria" };

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("users").select("organisation_id, role").eq("id", user!.id).single();
  const orgId = profile?.organisation_id;

  const { data: staff } = await supabase
    .from("users")
    .select("id, full_name, email, role, is_active, created_at")
    .eq("organisation_id", orgId)
    .order("full_name");

  const { data: compliance } = await supabase
    .from("staff_compliance")
    .select("user_id, item_label, expiry_date, status")
    .eq("organisation_id", orgId)
    .order("expiry_date");

  const complianceByUser = compliance?.reduce((acc, c) => {
    if (!acc[c.user_id]) acc[c.user_id] = [];
    acc[c.user_id].push(c);
    return acc;
  }, {} as Record<string, typeof compliance>) ?? {};

  const ROLE_LABELS: Record<string, string> = {
    owner: "Owner", coordinator: "Coordinator", support_worker: "Support Worker",
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Staff</h2>
          <p className="text-sm text-slate-500 mt-0.5">{staff?.filter(s => s.is_active).length ?? 0} active team members</p>
        </div>
        {profile?.role !== "support_worker" && (
          <Link href="/staff/invite" className="btn-primary"><Plus className="w-4 h-4" /> Invite staff</Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {staff?.map(member => {
          const memberCompliance = complianceByUser[member.id] ?? [];
          const expiring = memberCompliance.filter(c => c.status === "expiring_soon" || c.status === "expired");
          return (
            <div key={member.id} className="card card-hover p-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-aria-gradient flex items-center justify-center text-sm font-bold text-white">
                    {member.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase() ?? "??"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{member.full_name}</p>
                      {member.id === user?.id && <span className="badge-teal">You</span>}
                    </div>
                    <p className="text-sm text-slate-500">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <span className="badge-slate">{ROLE_LABELS[member.role] ?? member.role}</span>
                  {member.is_active ? <span className="badge-green">Active</span> : <span className="badge-slate">Inactive</span>}
                  {expiring.length > 0 && (
                    <div className="flex items-center gap-1 badge-yellow">
                      <AlertCircle className="w-3 h-3" />
                      {expiring.length} compliance item{expiring.length > 1 ? "s" : ""} expiring
                    </div>
                  )}
                  {expiring.length === 0 && memberCompliance.length > 0 && (
                    <div className="flex items-center gap-1 badge-green">
                      <CheckCircle className="w-3 h-3" /> Compliant
                    </div>
                  )}
                </div>
              </div>

              {memberCompliance.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-50">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Compliance Items</p>
                  <div className="flex flex-wrap gap-2">
                    {memberCompliance.map(c => {
                      const days = c.expiry_date ? daysUntil(c.expiry_date) : null;
                      const isExpired = c.status === "expired";
                      const isExpiring = c.status === "expiring_soon";
                      return (
                        <div key={c.item_label} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${isExpired ? "bg-red-50 text-red-700 border-red-200" : isExpiring ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                          {isExpired ? <AlertCircle className="w-3 h-3" /> : isExpiring ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {c.item_label}
                          {c.expiry_date && <span className="opacity-70">· {isExpired ? "Expired" : `${days}d`}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

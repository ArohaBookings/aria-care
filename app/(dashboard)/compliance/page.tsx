import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Shield, AlertCircle, CheckCircle, Clock, X } from "lucide-react";
import { formatDate, daysUntil } from "@/lib/utils";

export const metadata = { title: "Compliance | Aria" };

export default async function CompliancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("users").select("organisation_id").eq("id", user!.id).single();
  const orgId = profile?.organisation_id;

  const [{ data: staffItems }, { data: planReviews }, { data: incidents }] = await Promise.all([
    supabase.from("staff_compliance").select("id, item_label, expiry_date, status, users(full_name)").eq("organisation_id", orgId).order("expiry_date"),
    supabase.from("participants").select("id, full_name, plan_end_date, status").eq("organisation_id", orgId).eq("status", "active").not("plan_end_date", "is", null).order("plan_end_date"),
    supabase.from("incidents").select("id, incident_date, incident_type, severity, status, participants(full_name)").eq("organisation_id", orgId).neq("status", "closed").order("incident_date", { ascending: false }).limit(10),
  ]);

  const expired = staffItems?.filter(i => i.status === "expired") ?? [];
  const expiringSoon = staffItems?.filter(i => i.status === "expiring_soon") ?? [];
  const compliant = staffItems?.filter(i => i.status === "active") ?? [];

  const plansDue30 = planReviews?.filter(p => { const d = daysUntil(p.plan_end_date); return d >= 0 && d <= 30; }) ?? [];
  const plansDue60 = planReviews?.filter(p => { const d = daysUntil(p.plan_end_date); return d > 30 && d <= 60; }) ?? [];
  const plansDue90 = planReviews?.filter(p => { const d = daysUntil(p.plan_end_date); return d > 60 && d <= 90; }) ?? [];

  const overallStatus = expired.length > 0 ? "critical" : expiringSoon.length > 0 || plansDue30.length > 0 ? "warning" : "good";

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Compliance</h2>
          <p className="text-sm text-slate-500 mt-0.5">Your compliance dashboard at a glance</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm ${overallStatus === "good" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : overallStatus === "warning" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {overallStatus === "good" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {overallStatus === "good" ? "All compliant" : overallStatus === "warning" ? "Action needed" : "Critical items"}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Expired", count: expired.length, color: "red", icon: X },
          { label: "Expiring Soon", count: expiringSoon.length, color: "amber", icon: Clock },
          { label: "Plans Due 30d", count: plansDue30.length, color: "orange", icon: AlertCircle },
          { label: "Open Incidents", count: incidents?.length ?? 0, color: "purple", icon: Shield },
        ].map(({ label, count, color, icon: Icon }) => (
          <div key={label} className={`card p-5 ${count > 0 && color === "red" ? "border-red-200 bg-red-50/50" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <Icon className={`w-5 h-5 ${color === "red" ? "text-red-500" : color === "amber" ? "text-amber-500" : color === "orange" ? "text-orange-500" : "text-purple-500"}`} />
              <span className={`font-display text-3xl font-bold ${count > 0 ? color === "red" ? "text-red-700" : color === "amber" ? "text-amber-700" : "text-slate-900" : "text-slate-900"}`}>{count}</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Staff compliance */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-slate-900 text-sm">Staff Compliance Items</h3>
        </div>
        {!staffItems?.length ? (
          <div className="p-8 text-center text-sm text-slate-500">No compliance items tracked yet.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {[...expired, ...expiringSoon, ...compliant].map(item => {
              const days = item.expiry_date ? daysUntil(item.expiry_date) : null;
              const user_data = item.users as unknown as { full_name: string } | null;
              return (
                <div key={item.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.item_label}</p>
                    <p className="text-xs text-slate-500">{user_data?.full_name ?? "Unknown staff"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.expiry_date && <span className="text-xs text-slate-500">{formatDate(item.expiry_date)}</span>}
                    <span className={item.status === "expired" ? "badge-red" : item.status === "expiring_soon" ? "badge-yellow" : "badge-green"}>
                      {item.status === "expired" ? "Expired" : item.status === "expiring_soon" ? `${days}d left` : "Valid"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Plan reviews */}
      {(plansDue30.length > 0 || plansDue60.length > 0 || plansDue90.length > 0) && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 text-sm">Plan Review Upcoming</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {[...plansDue30, ...plansDue60, ...plansDue90].map(p => {
              const days = daysUntil(p.plan_end_date);
              return (
                <div key={p.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-aria-gradient flex items-center justify-center text-xs font-bold text-white">
                      {p.full_name.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{p.full_name}</p>
                      <p className="text-xs text-slate-500">Plan ends {formatDate(p.plan_end_date)}</p>
                    </div>
                  </div>
                  <span className={days <= 30 ? "badge-red" : days <= 60 ? "badge-yellow" : "badge-slate"}>
                    {days}d remaining
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Open incidents */}
      {incidents && incidents.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 text-sm">Open Incidents</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {incidents.map(inc => {
              const participant_data = inc.participants as unknown as { full_name: string } | null;
              return (
                <div key={inc.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{inc.incident_type}</p>
                    <p className="text-xs text-slate-500">{participant_data?.full_name} · {formatDate(inc.incident_date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={inc.severity === "high" ? "badge-red" : inc.severity === "medium" ? "badge-yellow" : "badge-slate"}>{inc.severity}</span>
                    <span className="badge-slate">{inc.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

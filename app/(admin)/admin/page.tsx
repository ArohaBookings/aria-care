import { createAdminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Users, Building2, DollarSign, TrendingUp, AlertCircle, Activity, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const adminSb = createAdminSupabase();

  const [
    { count: totalUsers },
    { count: totalOrgs },
    { count: activeOrgs },
    { count: trialOrgs },
    { data: recentOrgs },
    { data: recentAudit },
    { data: planCounts },
  ] = await Promise.all([
    adminSb.from("users").select("*", { count: "exact", head: true }),
    adminSb.from("organisations").select("*", { count: "exact", head: true }),
    adminSb.from("organisations").select("*", { count: "exact", head: true }).eq("subscription_status", "active"),
    adminSb.from("organisations").select("*", { count: "exact", head: true }).eq("subscription_tier", "trial"),
    adminSb.from("organisations").select("id, name, subscription_tier, subscription_status, created_at, contact_email").order("created_at", { ascending: false }).limit(8),
    adminSb.from("admin_audit_log").select("action, admin_email, target_type, created_at").order("created_at", { ascending: false }).limit(10),
    adminSb.from("organisations").select("subscription_tier").neq("subscription_tier", "trial"),
  ]);

  // MRR calculation
  const PLAN_PRICES: Record<string, number> = { starter: 149, growth: 349, business: 699 };
  const mrr = (planCounts ?? []).reduce((sum, o) => sum + (PLAN_PRICES[o.subscription_tier] ?? 0), 0);

  const PLAN_BADGE: Record<string, string> = {
    trial: "bg-slate-700 text-slate-300",
    starter: "bg-teal-900 text-teal-300",
    growth: "bg-blue-900 text-blue-300",
    business: "bg-purple-900 text-purple-300",
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Overview</h1>
        <p className="text-slate-400 text-sm mt-0.5">Real-time metrics across all Aria organisations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: totalUsers ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
          { label: "Organisations", value: totalOrgs ?? 0, icon: Building2, color: "text-teal-400", bg: "bg-teal-400/10" },
          { label: "Active Subscriptions", value: activeOrgs ?? 0, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10" },
          { label: "Monthly Revenue", value: `$${mrr.toLocaleString()}`, icon: DollarSign, color: "text-amber-400", bg: "bg-amber-400/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
            <p className={`font-display text-3xl font-bold ${color} mb-0.5`}>{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Trial vs paid breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm">Plan Distribution</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "Business ($699)", count: planCounts?.filter(o => o.subscription_tier === "business").length ?? 0, color: "bg-purple-500" },
              { label: "Growth ($349)", count: planCounts?.filter(o => o.subscription_tier === "growth").length ?? 0, color: "bg-blue-500" },
              { label: "Starter ($149)", count: planCounts?.filter(o => o.subscription_tier === "starter").length ?? 0, color: "bg-teal-500" },
              { label: "Trial", count: trialOrgs ?? 0, color: "bg-slate-600" },
            ].map(({ label, count, color }) => {
              const total = (totalOrgs ?? 1);
              const pct = Math.round((count / total) * 100);
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-slate-300 font-semibold">{count} orgs</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent audit log */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" /> Admin Activity
            </h3>
            <Link href="/admin/audit-log" className="text-xs text-teal-400 hover:underline">View all →</Link>
          </div>
          {!recentAudit?.length ? (
            <p className="text-sm text-slate-500 text-center py-6">No admin activity yet</p>
          ) : (
            <div className="space-y-2">
              {recentAudit.map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-300 font-medium">{log.action}</span>
                    <span className="text-slate-500"> · {log.admin_email}</span>
                  </div>
                  <span className="text-slate-600 flex-shrink-0">{formatDate(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent signups */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">Recent Organisations</h3>
          <Link href="/admin/organisations" className="text-xs text-teal-400 hover:underline flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-slate-800/50">
          {recentOrgs?.map((org) => (
            <div key={org.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                  {org.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-100">{org.name}</p>
                  <p className="text-xs text-slate-500">{org.contact_email ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{formatDate(org.created_at)}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PLAN_BADGE[org.subscription_tier] ?? "bg-slate-700 text-slate-300"}`}>
                  {org.subscription_tier}
                </span>
                <Link href={`/admin/organisations?id=${org.id}`} className="text-xs text-teal-400 hover:underline">
                  Manage →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

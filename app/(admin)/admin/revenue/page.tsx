import { createAdminSupabase } from "@/lib/supabase/admin";

const PLAN_PRICES: Record<string, number> = { starter: 149, growth: 349, business: 699 };

export default async function AdminRevenuePage() {
  const sb = createAdminSupabase();

  const { data: orgs } = await sb.from("organisations").select("subscription_tier, subscription_status, created_at").neq("subscription_tier", "trial");
  const { data: allOrgs } = await sb.from("organisations").select("subscription_tier, subscription_status, created_at, trial_ends_at");

  const active = orgs?.filter(o => o.subscription_status === "active") ?? [];
  const mrr = active.reduce((s, o) => s + (PLAN_PRICES[o.subscription_tier] ?? 0), 0);
  const arr = mrr * 12;

  const trialOrgs = allOrgs?.filter(o => o.subscription_tier === "trial") ?? [];
  const trialExpiringSoon = trialOrgs.filter(o => {
    if (!o.trial_ends_at) return false;
    const days = Math.ceil((new Date(o.trial_ends_at).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 7;
  });

  // Monthly signups (last 6 months)
  const months: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = d.toLocaleString("en-AU", { month: "short", year: "2-digit" });
    months[key] = 0;
  }
  allOrgs?.forEach(o => {
    const d = new Date(o.created_at);
    const key = d.toLocaleString("en-AU", { month: "short", year: "2-digit" });
    if (key in months) months[key]++;
  });

  const planDist = ["starter", "growth", "business"].map(p => ({
    plan: p, count: active.filter(o => o.subscription_tier === p).length,
    revenue: active.filter(o => o.subscription_tier === p).length * (PLAN_PRICES[p] ?? 0),
  }));

  const maxBar = Math.max(...Object.values(months), 1);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Revenue</h1>
        <p className="text-slate-400 text-sm mt-0.5">Live MRR, ARR, and plan breakdown</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "MRR", value: `$${mrr.toLocaleString()}`, sub: "Monthly recurring", color: "text-emerald-400" },
          { label: "ARR", value: `$${arr.toLocaleString()}`, sub: "Annual run rate", color: "text-blue-400" },
          { label: "Paying Customers", value: active.length, sub: "Active subscriptions", color: "text-teal-400" },
          { label: "Trials Expiring", value: trialExpiringSoon.length, sub: "Next 7 days", color: trialExpiringSoon.length > 0 ? "text-amber-400" : "text-slate-400" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide font-semibold">{label}</p>
            <p className={`font-display text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-600 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Plan breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-5">Revenue by Plan</h3>
        <div className="space-y-4">
          {planDist.map(({ plan, count, revenue }) => (
            <div key={plan} className="flex items-center gap-4">
              <div className="w-20 text-xs font-semibold text-slate-400 capitalize">{plan}</div>
              <div className="flex-1 h-8 bg-slate-800 rounded-lg overflow-hidden relative">
                <div
                  className={`h-full rounded-lg transition-all ${plan === "business" ? "bg-purple-600" : plan === "growth" ? "bg-blue-600" : "bg-teal-600"}`}
                  style={{ width: mrr > 0 ? `${Math.max((revenue / mrr) * 100, 2)}%` : "2%" }}
                />
                <div className="absolute inset-0 flex items-center px-3">
                  <span className="text-xs font-semibold text-white">{count} customers · ${revenue.toLocaleString()}/mo</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly signups bar chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-5">New Signups (Last 6 Months)</h3>
        <div className="flex items-end gap-3 h-40">
          {Object.entries(months).map(([month, count]) => (
            <div key={month} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-xs font-bold text-slate-300">{count > 0 ? count : ""}</span>
              <div className="w-full rounded-t-lg bg-teal-600/80 transition-all" style={{ height: `${Math.max((count / maxBar) * 120, count > 0 ? 8 : 4)}px` }} />
              <span className="text-[10px] text-slate-500">{month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trials expiring soon */}
      {trialExpiringSoon.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-5">
          <h3 className="font-semibold text-amber-300 mb-3 flex items-center gap-2">⚠️ Trials Expiring in 7 Days</h3>
          <p className="text-sm text-amber-400/80">
            {trialExpiringSoon.length} organisation{trialExpiringSoon.length !== 1 ? "s" : ""} will lose access soon. Consider reaching out to convert them.
          </p>
        </div>
      )}
    </div>
  );
}

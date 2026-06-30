import { createAdminSupabase } from "@/lib/supabase/admin";
import { Users, Building2, DollarSign, TrendingUp, Activity, ArrowUpRight, FileText, Copy, CheckCircle, BarChart3, PieChart, Target } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const adminSb = createAdminSupabase();
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();

  const [
    { count: totalUsers },
    { count: totalOrgs },
    { count: activeOrgs },
    { count: trialOrgs },
    { data: recentOrgs },
    { data: recentAudit },
    { data: planCounts },
    { data: monthlySoloRows },
    { data: soloFunnelUsers },
    { data: allSoloRows },
    { count: totalSoloNotes },
    { count: providerNotesMonth },
  ] = await Promise.all([
    adminSb.from("users").select("*", { count: "exact", head: true }),
    adminSb.from("organisations").select("*", { count: "exact", head: true }),
    adminSb.from("organisations").select("*", { count: "exact", head: true }).eq("subscription_status", "active"),
    adminSb.from("organisations").select("*", { count: "exact", head: true }).eq("subscription_tier", "trial"),
    adminSb.from("organisations").select("id, name, subscription_tier, subscription_status, created_at, contact_email").order("created_at", { ascending: false }).limit(8),
    adminSb.from("admin_audit_log").select("action, admin_email, target_type, created_at").order("created_at", { ascending: false }).limit(10),
    adminSb.from("organisations").select("subscription_tier, subscription_status, stripe_subscription_id").neq("subscription_tier", "trial"),
    adminSb.from("solo_notes").select("user_id, note_type, copied_at, submitted_at, created_at").gte("created_at", monthStart).limit(5000),
    adminSb.from("users").select("id, account_type, solo_usage_reset_at, organisations(subscription_tier, product_mode, solo_note_limit_override)").limit(10000),
    adminSb.from("solo_notes").select("user_id, copied_at, submitted_at, created_at").limit(10000),
    adminSb.from("solo_notes").select("*", { count: "exact", head: true }),
    adminSb.from("progress_notes").select("*", { count: "exact", head: true }).gte("created_at", monthStart),
  ]);

  const sixMoAgo = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 5, 1)).toISOString();
  const [
    { count: totalParticipants },
    { count: participantFriendlyCount },
    { count: incidentsThisMonth },
    { data: orgDates },
    { data: soloDates },
    { data: providerDates },
  ] = await Promise.all([
    adminSb.from("participants").select("*", { count: "exact", head: true }).eq("status", "active"),
    adminSb.from("solo_notes").select("*", { count: "exact", head: true }).not("participant_text", "is", null),
    adminSb.from("progress_notes").select("*", { count: "exact", head: true }).eq("incident_flagged", true).gte("created_at", monthStart),
    adminSb.from("organisations").select("created_at"),
    adminSb.from("solo_notes").select("created_at").gte("created_at", sixMoAgo).limit(50000),
    adminSb.from("progress_notes").select("created_at").gte("created_at", sixMoAgo).limit(50000),
  ]);

  // Monthly buckets (last 6 months) for signups + notes created
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    monthKeys.push(d.toLocaleString("en-AU", { month: "short", year: "2-digit" }));
  }
  const bucket = (rows: Array<{ created_at: string }> | null) => {
    const m: Record<string, number> = Object.fromEntries(monthKeys.map((k) => [k, 0]));
    for (const r of rows ?? []) {
      const k = new Date(r.created_at).toLocaleString("en-AU", { month: "short", year: "2-digit" });
      if (k in m) m[k] += 1;
    }
    return monthKeys.map((k) => ({ label: k, value: m[k] }));
  };
  const signupSeries = bucket(orgDates);
  const noteSeries = (() => {
    const m: Record<string, number> = Object.fromEntries(monthKeys.map((k) => [k, 0]));
    for (const r of [...(soloDates ?? []), ...(providerDates ?? [])]) {
      const k = new Date(r.created_at).toLocaleString("en-AU", { month: "short", year: "2-digit" });
      if (k in m) m[k] += 1;
    }
    return monthKeys.map((k) => ({ label: k, value: m[k] }));
  })();

  // MRR/ARR: only genuine payers (paid tier + active status + a live Stripe
  // subscription). Super-admin and comped/admin_override accounts are excluded.
  const PLAN_PRICES: Record<string, number> = { starter: 149, growth: 349, business: 699, solo: 19, solo_pro: 29 };
  const PAID_TIERS = new Set(["starter", "growth", "business", "solo", "solo_pro"]);
  const payingOrgs = (planCounts ?? []).filter((o) =>
    PAID_TIERS.has(o.subscription_tier) && o.subscription_status === "active" && !!o.stripe_subscription_id
  );
  const mrr = payingOrgs.reduce((sum, o) => sum + (PLAN_PRICES[o.subscription_tier] ?? 0), 0);
  const arr = mrr * 12;
  const compedInternalCount = (planCounts ?? []).filter((o) =>
    o.subscription_status === "admin_override" ||
    (PAID_TIERS.has(o.subscription_tier) && o.subscription_status === "active" && !o.stripe_subscription_id)
  ).length;

  const PLAN_BADGE: Record<string, string> = {
    trial: "bg-slate-700 text-slate-300",
    starter: "bg-teal-900 text-teal-300",
    growth: "bg-blue-900 text-blue-300",
    business: "bg-purple-900 text-purple-300",
    solo_free: "bg-slate-700 text-slate-300",
    solo: "bg-cyan-900 text-cyan-300",
    solo_pro: "bg-emerald-900 text-emerald-300",
  };

  let soloMetrics = {
    solo_users: 0,
    provider_users: totalUsers ?? 0,
    free_solo_users: 0,
    paid_solo_users: 0,
    monthly_solo_notes: 0,
    note_type_counts: {} as Record<string, number>,
    platform_counts: {} as Record<string, number>,
    feedback_count: 0,
  };
  const { data: soloMetricData } = await adminSb.from("admin_solo_metrics").select("*").maybeSingle();
  if (soloMetricData) {
    soloMetrics = {
      ...soloMetrics,
      ...soloMetricData,
      note_type_counts: (soloMetricData.note_type_counts ?? {}) as Record<string, number>,
      platform_counts: (soloMetricData.platform_counts ?? {}) as Record<string, number>,
    };
  }

  const soloRowsThisMonth = monthlySoloRows ?? [];
  const monthlySoloNotes = soloMetrics.monthly_solo_notes || soloRowsThisMonth.length;
  const copiedSoloMonth = soloRowsThisMonth.filter((row) => row.copied_at).length;
  const submittedSoloMonth = soloRowsThisMonth.filter((row) => row.submitted_at).length;
  const allStoriesMonth = monthlySoloNotes + (providerNotesMonth ?? 0);
  const soloConversionRate = soloMetrics.solo_users > 0
    ? Math.round((soloMetrics.paid_solo_users / soloMetrics.solo_users) * 100)
    : 0;
  const copyRate = monthlySoloNotes > 0 ? Math.round((copiedSoloMonth / monthlySoloNotes) * 100) : 0;
  const submittedRate = monthlySoloNotes > 0 ? Math.round((submittedSoloMonth / monthlySoloNotes) * 100) : 0;
  const noteTypeCounts = soloRowsThisMonth.reduce<Record<string, number>>((acc, row) => {
    const key = row.note_type || "progress";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const noteTypeEntries = Object.entries(Object.keys(noteTypeCounts).length ? noteTypeCounts : soloMetrics.note_type_counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label: label.replaceAll("_", " "), value }));
  const platformEntries = Object.entries(soloMetrics.platform_counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label: label || "Not selected", value }));
  const soloFunnelRecords = (soloFunnelUsers ?? []).filter((row: any) => {
    const org = row.organisations as { product_mode?: string; subscription_tier?: string } | null;
    return row.account_type === "solo" || org?.product_mode === "solo" || org?.subscription_tier?.startsWith("solo");
  });
  const allSoloRowsSafe = allSoloRows ?? [];
  const totalNotesByUser = allSoloRowsSafe.reduce<Record<string, number>>((acc: Record<string, number>, row: any) => {
    if (!row.user_id) return acc;
    acc[row.user_id] = (acc[row.user_id] ?? 0) + 1;
    return acc;
  }, {});
  const monthlyNotesByUser = soloRowsThisMonth.reduce<Record<string, number>>((acc: Record<string, number>, row: any) => {
    if (!row.user_id) return acc;
    acc[row.user_id] = (acc[row.user_id] ?? 0) + 1;
    return acc;
  }, {});
  const usersWithZeroNotes = soloFunnelRecords.filter((row: any) => !totalNotesByUser[row.id]).length;
  const usersWithOneNote = soloFunnelRecords.filter((row: any) => totalNotesByUser[row.id] === 1).length;
  const usersWhoCopied = new Set(allSoloRowsSafe.filter((row: any) => row.copied_at).map((row: any) => row.user_id)).size;
  const freeLimitUsers = soloFunnelRecords.filter((row: any) => {
    const org = row.organisations as { subscription_tier?: string; solo_note_limit_override?: number | null } | null;
    if (org?.subscription_tier !== "solo_free") return false;
    const limit = org?.solo_note_limit_override ?? 3;
    return (monthlyNotesByUser[row.id] ?? 0) >= limit;
  }).length;

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "ARR (run rate)", value: `$${arr.toLocaleString()}`, color: "text-emerald-400" },
          { label: "Paying Customers", value: payingOrgs.length, color: "text-teal-400" },
          { label: "Comped / Internal", value: compedInternalCount, color: "text-slate-300" },
          { label: "Active Participants", value: totalParticipants ?? 0, color: "text-blue-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className={`font-display text-3xl font-bold ${color} mb-0.5`}>{typeof value === "number" ? value.toLocaleString() : value}</p>
            <p className="text-xs text-slate-500">{label}</p>
            {label === "Comped / Internal" && <p className="text-[10px] text-slate-600 mt-0.5">Excluded from MRR/ARR</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Solo Users", value: soloMetrics.solo_users, color: "text-cyan-400" },
          { label: "Free Solo", value: soloMetrics.free_solo_users, color: "text-slate-300" },
          { label: "Paid Solo", value: soloMetrics.paid_solo_users, color: "text-emerald-400" },
          { label: "Notes This Month", value: allStoriesMonth, color: "text-teal-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className={`font-display text-3xl font-bold ${color} mb-0.5`}>{Number(value ?? 0).toLocaleString()}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-hidden relative">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl animate-soft-float" />
          <div className="relative flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-300" /> Note Mix This Month
              </h3>
              <p className="text-xs text-slate-500 mt-1">Solo note type usage without exposing private note content.</p>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-bold text-slate-300">
              {monthlySoloNotes.toLocaleString()} Solo
            </span>
          </div>
          <BarList items={noteTypeEntries} emptyLabel="No Solo notes generated this month yet." />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-5">
            <Target className="w-4 h-4 text-emerald-300" /> Conversion Pulse
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <DonutStat label="Paid Solo" value={soloConversionRate} color="#34d399" />
            <DonutStat label="Copied" value={copyRate} color="#22d3ee" />
            <DonutStat label="Submitted" value={submittedRate} color="#2dd4bf" />
          </div>
          <div className="mt-5 space-y-2 text-xs">
            <div className="flex justify-between rounded-xl bg-slate-950/70 px-3 py-2">
              <span className="text-slate-500">Total Solo notes</span>
              <span className="font-semibold text-slate-200">{(totalSoloNotes ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between rounded-xl bg-slate-950/70 px-3 py-2">
              <span className="text-slate-500">Provider notes this month</span>
              <span className="font-semibold text-slate-200">{(providerNotesMonth ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between rounded-xl bg-slate-950/70 px-3 py-2">
              <span className="text-slate-500">Participant-friendly summaries</span>
              <span className="font-semibold text-slate-200">{(participantFriendlyCount ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between rounded-xl bg-slate-950/70 px-3 py-2">
              <span className="text-slate-500">Incidents flagged (month)</span>
              <span className="font-semibold text-slate-200">{(incidentsThisMonth ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between rounded-xl bg-slate-950/70 px-3 py-2">
              <span className="text-slate-500">Feedback submitted</span>
              <span className="font-semibold text-slate-200">{soloMetrics.feedback_count.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-5"><TrendingUp className="w-4 h-4 text-teal-300" /> Signups (last 6 months)</h3>
          <MonthlyBars series={signupSeries} />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-5"><BarChart3 className="w-4 h-4 text-cyan-300" /> Notes created (last 6 months)</h3>
          <MonthlyBars series={noteSeries} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "0-note Solo users", value: usersWithZeroNotes, hint: "Activation gap", color: "text-amber-300" },
          { label: "1-note Solo users", value: usersWithOneNote, hint: "Second-use opportunity", color: "text-cyan-300" },
          { label: "Users who copied", value: usersWhoCopied, hint: "Ever copied a draft", color: "text-emerald-300" },
          { label: "Hit free limit", value: freeLimitUsers, hint: "This month", color: "text-rose-300" },
        ].map(({ label, value, hint, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className={`font-display text-3xl font-bold ${color} mb-0.5`}>{Number(value ?? 0).toLocaleString()}</p>
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-1 text-[10px] text-slate-600">{hint}</p>
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
              { label: "Solo Pro ($29)", count: planCounts?.filter(o => o.subscription_tier === "solo_pro").length ?? 0, color: "bg-emerald-500" },
              { label: "Solo ($19)", count: planCounts?.filter(o => o.subscription_tier === "solo").length ?? 0, color: "bg-cyan-500" },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <PieChart className="w-4 h-4 text-teal-300" /> Platforms Solo Users Mention
              </h3>
              <p className="text-xs text-slate-500 mt-1">Useful for positioning around ShiftCare, Lumary, Brevity and other copy/paste workflows.</p>
            </div>
          </div>
          <BarList items={platformEntries} emptyLabel="No platform selections captured yet." />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-emerald-300" /> Upgrade Levers
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Free to paid", value: `${soloConversionRate}%`, icon: CheckCircle, hint: `${soloMetrics.paid_solo_users}/${Math.max(soloMetrics.solo_users, 1)} Solo users` },
              { label: "Copy adoption", value: `${copyRate}%`, icon: Copy, hint: `${copiedSoloMonth}/${Math.max(monthlySoloNotes, 1)} copied` },
              { label: "Solo activity", value: monthlySoloNotes.toLocaleString(), icon: FileText, hint: "Solo notes this month" },
              { label: "Provider activity", value: (providerNotesMonth ?? 0).toLocaleString(), icon: Building2, hint: "Team notes this month" },
            ].map(({ label, value, icon: Icon, hint }) => (
              <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="font-display text-2xl font-bold text-white">{value}</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">{label}</p>
                <p className="mt-1 text-[10px] text-slate-600">{hint}</p>
              </div>
            ))}
          </div>
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

function BarList({ items, emptyLabel }: { items: Array<{ label: string; value: number }>; emptyLabel: string }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 p-8 text-center text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const pct = Math.max(6, Math.round((item.value / max) * 100));
        return (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="capitalize text-slate-400">{item.label}</span>
              <span className="font-semibold text-slate-200">{item.value.toLocaleString()}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="chart-bar-pop h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-400"
                style={{ width: `${pct}%`, animationDelay: `${index * 70}ms` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyBars({ series }: { series: Array<{ label: string; value: number }> }) {
  const max = Math.max(...series.map((s) => s.value), 1);
  return (
    <div className="flex items-end gap-3 h-40">
      {series.map((s) => (
        <div key={s.label} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold text-slate-300">{s.value > 0 ? s.value : ""}</span>
          <div className="w-full rounded-t-lg bg-gradient-to-t from-teal-500 to-cyan-400 transition-all" style={{ height: `${Math.max((s.value / max) * 120, s.value > 0 ? 8 : 4)}px` }} />
          <span className="text-[10px] text-slate-500">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutStat({ label, value, color }: { label: string; value: number; color: string }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="text-center">
      <div
        className="mx-auto grid h-20 w-20 place-items-center rounded-full p-1"
        style={{ background: `conic-gradient(${color} ${safeValue}%, rgba(51, 65, 85, 0.85) 0)` }}
      >
        <div className="grid h-full w-full place-items-center rounded-full bg-slate-900">
          <span className="font-display text-lg font-bold text-white">{safeValue}%</span>
        </div>
      </div>
      <p className="mt-2 text-[11px] font-semibold text-slate-400">{label}</p>
    </div>
  );
}

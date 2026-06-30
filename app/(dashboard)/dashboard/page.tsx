import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Mic, Users, AlertTriangle, Clock, ArrowRight, CheckCircle, Shield, Calendar, Copy, FileText, Sparkles, BarChart3, TrendingUp, Rocket, Target } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { normalizeSoloPlan, soloMonthlyNoteLimit } from "@/lib/usage-limits";

export const metadata = { title: "Dashboard | Aria" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, organisation_id, account_type, solo_usage_reset_at, organisations(name, subscription_tier, product_mode, solo_note_limit_override, solo_platform)")
    .eq("id", user.id)
    .single();
  const orgId = profile?.organisation_id;
  const org = profile?.organisations as unknown as {
    name?: string;
    subscription_tier?: string;
    product_mode?: string;
    solo_note_limit_override?: number | null;
    solo_platform?: string | null;
  } | null;
  const isSolo = profile?.account_type === "solo" || org?.product_mode === "solo" || org?.subscription_tier?.startsWith("solo");
  const currentMonthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();

  if (isSolo) {
    const plan = normalizeSoloPlan(org?.subscription_tier);
    const limit = soloMonthlyNoteLimit(plan, org?.solo_note_limit_override ?? null);
    const resetAt = profile?.solo_usage_reset_at;
    const usageStart = resetAt && new Date(resetAt) > new Date(currentMonthStart) ? resetAt : currentMonthStart;
    const [{ data: monthlySoloNotes }, { data: recentSoloNotes }] = await Promise.all([
      supabase.from("solo_notes").select("id, note_type, copied_at, submitted_at, created_at").eq("user_id", user.id).gte("created_at", usageStart).order("created_at", { ascending: false }).limit(1000),
      supabase.from("solo_notes").select("id, note_type, draft_text, copied_at, submitted_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    ]);

    return (
      <SoloDashboard
        firstName={(profile?.full_name ?? "there").split(" ")[0]}
        plan={plan}
        platform={org?.solo_platform ?? null}
        used={monthlySoloNotes?.length ?? 0}
        limit={limit}
        recentNotes={recentSoloNotes ?? []}
        monthlyNotes={monthlySoloNotes ?? []}
      />
    );
  }

  const [{ count: participantCount }, { count: pendingNotes }, { data: expiringCompliance }, { data: recentNotes }, { data: upcomingShifts }, { count: providerNotesThisMonth }] = await Promise.all([
    supabase.from("participants").select("*", { count: "exact", head: true }).eq("organisation_id", orgId).eq("status", "active"),
    supabase.from("progress_notes").select("*", { count: "exact", head: true }).eq("organisation_id", orgId).eq("status", "pending"),
    supabase.from("staff_compliance").select("item_label, expiry_date, users(full_name)").eq("organisation_id", orgId).eq("status", "expiring_soon").limit(5),
    supabase.from("progress_notes").select("id, created_at, note_text, status, participants(full_name), author_name").eq("organisation_id", orgId).order("created_at", { ascending: false }).limit(5),
    supabase.from("shifts").select("id, shift_date, start_time, participants(full_name), users(full_name)").eq("organisation_id", orgId).gte("shift_date", new Date().toISOString().split("T")[0]).order("shift_date").limit(5),
    supabase.from("progress_notes").select("*", { count: "exact", head: true }).eq("organisation_id", orgId).gte("created_at", currentMonthStart),
  ]);

  const firstName = (profile?.full_name ?? "there").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 max-w-7xl space-y-6">
      {/* Greeting */}
      <div className="animate-fade-up">
        <h2 className="font-display text-2xl font-bold text-slate-900">{greeting}, {firstName} 👋</h2>
        <p className="text-slate-500 text-sm mt-0.5">Here&apos;s what needs your attention today.</p>
      </div>

      {/* Quick action hero */}
      <Link href="/notes" className="group block card bg-gradient-to-r from-aria-600 to-teal-600 border-0 p-6 text-white hover:shadow-teal transition-all duration-200 animate-fade-up-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-lg">Record a Progress Note</p>
              <p className="text-white/75 text-sm">Tap to record — Aria writes the note for you</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-up-2">
        <StatCard icon={Users} label="Active Participants" value={participantCount ?? 0} color="teal" />
        <StatCard icon={Clock} label="Notes Pending Review" value={pendingNotes ?? 0} color={pendingNotes ? "amber" : "teal"} href="/notes?status=pending" />
        <StatCard icon={AlertTriangle} label="Expiring Compliance" value={expiringCompliance?.length ?? 0} color={expiringCompliance?.length ? "red" : "teal"} href="/compliance" />
        <StatCard icon={Calendar} label="Shifts This Week" value={upcomingShifts?.length ?? 0} color="teal" href="/rostering" />
      </div>

      <ProviderPulse
        notesThisMonth={providerNotesThisMonth ?? 0}
        participants={participantCount ?? 0}
        pendingNotes={pendingNotes ?? 0}
        upcomingShifts={upcomingShifts?.length ?? 0}
        complianceAlerts={expiringCompliance?.length ?? 0}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent notes */}
        <div className="lg:col-span-2 card p-5 animate-fade-up-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-slate-900">Recent Notes</h3>
            <Link href="/notes" className="text-xs text-aria-600 font-semibold hover:underline">View all →</Link>
          </div>
          {!recentNotes?.length ? (
            <EmptyState icon={Mic} text="No notes yet — record your first one above" />
          ) : (
            <div className="space-y-2">
              {recentNotes.map((note: any) => (
                <Link key={note.id} href={`/notes`} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${note.status === "approved" ? "bg-emerald-500" : "bg-amber-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{note.participants?.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{note.note_text?.slice(0, 80)}...</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`badge text-[10px] ${note.status === "approved" ? "badge-green" : "badge-yellow"}`}>{note.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4 animate-fade-up-4">
          {/* Upcoming shifts */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-slate-900">Upcoming Shifts</h3>
              <Link href="/rostering" className="text-xs text-aria-600 font-semibold hover:underline">Roster →</Link>
            </div>
            {!upcomingShifts?.length ? (
              <EmptyState icon={Calendar} text="No shifts scheduled" />
            ) : (
              <div className="space-y-2">
                {upcomingShifts.map((shift: any) => (
                  <div key={shift.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="w-8 h-8 bg-aria-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-aria-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{shift.participants?.full_name}</p>
                      <p className="text-[11px] text-slate-500">{formatDate(shift.shift_date)} · {shift.start_time?.slice(0,5)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compliance alerts */}
          {(expiringCompliance?.length ?? 0) > 0 && (
            <div className="card p-5 border-amber-200 bg-amber-50/50">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-amber-800 text-sm">Compliance Alerts</h3>
              </div>
              <div className="space-y-2">
                {expiringCompliance?.map((item: any) => (
                  <div key={item.id} className="text-xs text-amber-700">
                    <span className="font-semibold">{(item.users as any)?.full_name}</span> — {item.item_label} expires {formatDate(item.expiry_date)}
                  </div>
                ))}
              </div>
              <Link href="/compliance" className="mt-3 text-xs font-bold text-amber-700 hover:underline block">View all →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SoloDashboard({
  firstName,
  plan,
  platform,
  used,
  limit,
  recentNotes,
  monthlyNotes,
}: {
  firstName: string;
  plan: string;
  platform: string | null;
  used: number;
  limit: number;
  recentNotes: Array<{ id: string; note_type: string; draft_text: string; copied_at: string | null; submitted_at: string | null; created_at: string }>;
  monthlyNotes: Array<{ id: string; note_type: string; copied_at: string | null; submitted_at: string | null; created_at: string }>;
}) {
  const remaining = Math.max(limit - used, 0);
  const usagePct = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const isFree = plan === "solo_free";
  const typeItems = Object.entries(monthlyNotes.reduce<Record<string, number>>((acc, note) => {
    const key = note.note_type || "progress";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {}))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, value]) => ({ label: label.replaceAll("_", " "), value }));
  const submittedCount = monthlyNotes.filter((note) => note.submitted_at).length;
  const copiedCount = monthlyNotes.filter((note) => note.copied_at && !note.submitted_at).length;
  const draftCount = Math.max(used - copiedCount - submittedCount, 0);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div className="rounded-3xl bg-slate-950 text-white p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.24),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(8,145,178,0.16),transparent_35%)]" />
        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-end">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs font-semibold text-teal-100">
              <Sparkles className="w-3.5 h-3.5" /> Aria Care Solo
            </span>
            <h1 className="font-display text-3xl sm:text-5xl font-bold mt-4">Good to see you, {firstName}.</h1>
            <p className="text-slate-300 mt-3 max-w-2xl">
              Create in Aria Care, review it, then copy into {platform || "ShiftCare, Lumary, Brevity, CareMaster, or your workplace platform"}.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Link href="/notes" className="btn-primary justify-center py-3 px-6">
                <Mic className="w-4 h-4" /> Create note
              </Link>
              <Link href="/notes?mode=text" className="btn-secondary justify-center py-3 px-6">
                <FileText className="w-4 h-4" /> Type bullet points
              </Link>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/10 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Usage this month</p>
            <p className="font-display text-4xl font-bold mt-2">{used}/{limit}</p>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-aria-400 rounded-full" style={{ width: `${usagePct}%` }} />
            </div>
            <p className="text-xs text-teal-100 mt-2">{remaining} note{remaining === 1 ? "" : "s"} left</p>
          </div>
        </div>
      </div>

      {isFree && remaining === 1 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm font-medium text-amber-900">You&apos;ve got 1 free note left this month. Upgrade when you&apos;re ready to keep creating notes.</p>
          <Link href="/billing?reason=solo-note-limit" className="text-xs font-bold text-amber-800 hover:underline">Upgrade Solo</Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Voice note", desc: "Talk naturally after a shift. Aria structures it.", icon: Mic, href: "/notes" },
          { title: "Type bullet points", desc: "Messy notes in. Copy-ready draft out.", icon: FileText, href: "/notes?mode=text" },
          { title: "Copy-ready drafts", desc: "Full note, short note, handover and incident summaries.", icon: Copy, href: "/notes" },
        ].map(({ title, desc, icon: Icon, href }) => (
          <Link key={title} href={href} className="card card-hover p-5">
            <div className="w-10 h-10 rounded-xl bg-aria-50 text-aria-700 flex items-center justify-center mb-4">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600 mt-1">{desc}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-up-3">
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute right-[-2rem] top-[-2rem] h-28 w-28 rounded-full bg-aria-100 blur-2xl animate-soft-float" />
          <div className="relative flex items-center gap-4">
            <ProgressRing value={usagePct} label={`${used}/${limit}`} />
            <div>
              <p className="section-title mb-1">Monthly usage</p>
              <h3 className="font-display text-xl font-bold text-slate-900">{remaining} note{remaining === 1 ? "" : "s"} left</h3>
              <p className="mt-1 text-sm text-slate-600">
                {isFree ? "Free Solo includes 3 notes each month. Upgrade when you want more room." : "You have room for regular after-shift documentation this month."}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="section-title mb-1">Story mix</p>
              <h3 className="font-display font-bold text-slate-900">What you are creating</h3>
            </div>
            <BarChart3 className="h-5 w-5 text-aria-500" />
          </div>
          <LightBarList items={typeItems} emptyLabel="Create your first note to see your mix." />
        </div>

        <div className="card p-5 bg-gradient-to-b from-slate-950 to-slate-900 text-white">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-teal-200/80">Copy workflow</p>
              <h3 className="font-display font-bold">Draft to submitted</h3>
            </div>
            <Rocket className="h-5 w-5 text-teal-200" />
          </div>
          <div className="space-y-3">
            {[
              { label: "Drafts", value: draftCount, color: "bg-slate-500" },
              { label: "Copied", value: copiedCount, color: "bg-cyan-400" },
              { label: "Submitted", value: submittedCount, color: "bg-emerald-400" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="text-sm text-slate-200">{item.label}</span>
                </div>
                <span className="font-display text-lg font-bold">{item.value}</span>
              </div>
            ))}
          </div>
          {isFree && (
            <Link href="/billing" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition-all hover:bg-teal-50">
              Unlock 125 notes/month <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-slate-900">Recent notes</h3>
              <p className="text-xs text-slate-500">Your private Solo history.</p>
            </div>
            <Link href="/notes" className="text-xs text-aria-600 font-semibold hover:underline">View all</Link>
          </div>
          {recentNotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <Mic className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No Solo notes yet. Create your first one after a shift.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentNotes.map((note) => (
                <Link key={note.id} href="/notes" className="block rounded-2xl border border-slate-100 hover:border-aria-200 hover:bg-aria-50/30 px-4 py-3 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 capitalize">{note.note_type.replace("_", " ")}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{note.draft_text.slice(0, 110)}</p>
                    </div>
                    <span className={`badge text-[10px] ${note.submitted_at ? "badge-green" : note.copied_at ? "badge-teal" : "badge-slate"}`}>
                      {note.submitted_at ? "submitted" : note.copied_at ? "copied" : "draft"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5 bg-gradient-to-b from-aria-50/60 to-white">
          <p className="section-title mb-2">Simple reminder</p>
          <h3 className="font-display font-bold text-slate-900 mb-2">Drafts only, you stay in control.</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Aria helps reduce blank-page writing and missing details. Always review and edit before submitting to your workplace system.
          </p>
          {isFree && (
            <Link href="/billing" className="btn-primary mt-4 w-full justify-center">
              Upgrade for 125 notes/month <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function ProviderPulse({
  notesThisMonth,
  participants,
  pendingNotes,
  upcomingShifts,
  complianceAlerts,
}: {
  notesThisMonth: number;
  participants: number;
  pendingNotes: number;
  upcomingShifts: number;
  complianceAlerts: number;
}) {
  const pulseItems = [
    { label: "Notes this month", value: notesThisMonth },
    { label: "Active participants", value: participants },
    { label: "Pending review", value: pendingNotes },
    { label: "Upcoming shifts", value: upcomingShifts },
  ];

  return (
    <div className="card p-5 animate-fade-up-3">
      <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr_0.8fr] lg:items-center">
        <div>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-aria-50 text-aria-700">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="section-title mb-1">Operations pulse</p>
          <h3 className="font-display text-xl font-bold text-slate-900">Team documentation health</h3>
          <p className="mt-1 text-sm text-slate-600">Fast read on activity, review pressure and compliance attention.</p>
        </div>
        <LightBarList items={pulseItems} emptyLabel="No activity captured yet." />
        <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-aria-600" />
            <p className="text-sm font-bold text-slate-900">Next best action</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {complianceAlerts > 0
              ? "Clear compliance alerts before they become urgent."
              : pendingNotes > 0
              ? "Review pending notes to keep the team workflow moving."
              : "Momentum looks healthy. Keep capturing notes close to shift time."}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <CheckCircle className="h-3.5 w-3.5" /> {complianceAlerts} compliance alert{complianceAlerts === 1 ? "" : "s"}
          </div>
        </div>
      </div>
    </div>
  );
}

function LightBarList({ items, emptyLabel }: { items: Array<{ label: string; value: number }>; emptyLabel: string }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  if (!items.length) {
    return <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const pct = Math.max(item.value > 0 ? 8 : 0, Math.round((item.value / max) * 100));
        return (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="capitalize text-slate-500">{item.label}</span>
              <span className="font-bold text-slate-800">{item.value.toLocaleString()}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="chart-bar-pop h-full rounded-full bg-gradient-to-r from-aria-500 to-cyan-400"
                style={{ width: `${pct}%`, animationDelay: `${index * 70}ms` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProgressRing({ value, label }: { value: number; label: string }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className="grid h-24 w-24 flex-shrink-0 place-items-center rounded-full p-1"
      style={{ background: `conic-gradient(#14b8a6 ${safeValue}%, #e2e8f0 0)` }}
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-white">
        <div className="text-center">
          <p className="font-display text-lg font-black text-slate-950">{safeValue}%</p>
          <p className="text-[10px] font-bold text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, href }: { icon: React.ElementType; label: string; value: number; color: string; href?: string }) {
  const content = (
    <div className={`card card-hover p-5 ${href ? "cursor-pointer" : ""}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color === "teal" ? "bg-aria-50 text-aria-600" : color === "amber" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="font-display text-3xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <Icon className="w-8 h-8 text-slate-300 mb-2" />
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}

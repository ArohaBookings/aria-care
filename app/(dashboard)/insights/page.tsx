import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, AlertTriangle, ClipboardCheck, ArrowRight } from "lucide-react";
import InsightsFilterBar from "@/components/insights/InsightsFilterBar";
import { SectionCard, StatTile, VerticalBars, BarList } from "@/components/insights/Charts";
import {
  NoteRow, monthlyCounts, moodThemes, supportCategories, topGoals,
  needsReview, hasFollowUp, isConcern,
} from "@/lib/insights/aggregate";

export const metadata = { title: "Trends | Aria" };

const RANGE_DAYS: Record<string, number | null> = { "30": 30, "90": 90, "180": 180, "365": 365, all: null };

export default async function InsightsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, account_type, organisation_id, organisations(product_mode, subscription_tier)")
    .eq("id", user.id)
    .single();

  const org = (Array.isArray(profile?.organisations) ? profile?.organisations[0] : profile?.organisations) as { product_mode?: string; subscription_tier?: string } | undefined;
  const isSolo = profile?.account_type === "solo" || org?.product_mode === "solo" || (org?.subscription_tier?.startsWith("solo") ?? false);
  // Team trend charts are for provider/team admins only. Solo users never see them.
  if (isSolo) redirect("/dashboard");
  if (!["owner", "coordinator"].includes(profile?.role ?? "")) redirect("/dashboard");

  const orgId = profile?.organisation_id;

  // Fetch org notes (RLS-scoped to this org). Solo notes live in a separate table and are never read here.
  const { data: rawNotes } = await supabase
    .from("progress_notes")
    .select("id, participant_id, author_id, author_name, created_at, shift_date, note_text, mood, support_type, support_level, incident_flagged, suggested_review, suggested_review_reason, status, goals_referenced")
    .eq("organisation_id", orgId)
    .order("created_at", { ascending: false })
    .limit(2000);

  const [{ data: participantRows }, { data: workerRows }] = await Promise.all([
    supabase.from("participants").select("id, full_name").eq("organisation_id", orgId).order("full_name"),
    supabase.from("users").select("id, full_name").eq("organisation_id", orgId).order("full_name"),
  ]);

  const allNotes = (rawNotes ?? []) as NoteRow[];
  const participantName = new Map((participantRows ?? []).map((p) => [p.id, p.full_name]));
  const workerName = new Map((workerRows ?? []).map((w) => [w.id, w.full_name]));
  const supportTypes = [...new Set(allNotes.map((n) => (n.support_type ?? "").trim()).filter(Boolean))].sort();

  // --- Apply filters ---
  const rangeKey = (typeof sp.range === "string" ? sp.range : "90");
  const days = RANGE_DAYS[rangeKey] ?? 90;
  const from = days ? Date.now() - days * 86400000 : null;
  const participantFilter = typeof sp.participant === "string" ? sp.participant : "";
  const workerFilter = typeof sp.worker === "string" ? sp.worker : "";
  const typeFilter = typeof sp.type === "string" ? sp.type : "";
  const incidentOnly = sp.incident === "1";
  const followUpOnly = sp.followup === "1";

  const notes = allNotes.filter((n) => {
    const t = new Date(n.shift_date ?? n.created_at).getTime();
    if (from && t < from) return false;
    if (participantFilter && n.participant_id !== participantFilter) return false;
    if (workerFilter && n.author_id !== workerFilter) return false;
    if (typeFilter && (n.support_type ?? "") !== typeFilter) return false;
    if (incidentOnly && !n.incident_flagged) return false;
    if (followUpOnly && !hasFollowUp(n)) return false;
    return true;
  });

  const monthsCount = days && days <= 90 ? 3 : days && days <= 180 ? 6 : 12;
  const reviewCount = notes.filter(needsReview).length;
  const followUpCount = notes.filter(hasFollowUp).length;
  const concernCount = notes.filter(isConcern).length;
  const incidentCount = notes.filter((n) => n.incident_flagged).length;

  return (
    <div className="p-6 max-w-6xl space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-aria-600" /> Support activity overview
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Trends from recorded notes — themes and activity over time, not clinical outcomes.</p>
        </div>
        <Link href="/coordinator" className="btn-secondary text-sm">
          Coordinator overview <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
        These charts summarise what was recorded in progress notes. They are an aid to review and handover — they do not diagnose, measure outcomes, or prove that goals were met.
      </div>

      <InsightsFilterBar
        participants={(participantRows ?? []).map((p) => ({ id: p.id, label: p.full_name }))}
        workers={(workerRows ?? []).map((w) => ({ id: w.id, label: w.full_name }))}
        supportTypes={supportTypes}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Notes in range" value={notes.length} sub="recorded notes" />
        <StatTile label="Incident/behaviour mentions" value={incidentCount} sub="flagged in notes" tone={incidentCount ? "red" : "teal"} />
        <StatTile label="Areas to review" value={reviewCount} sub="pending or flagged for review" tone={reviewCount ? "amber" : "teal"} />
        <StatTile label="Follow-up mentioned" value={followUpCount} sub="notes mentioning follow-up" tone={followUpCount ? "amber" : "teal"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Notes recorded over time" hint="count of notes by month">
          <VerticalBars series={monthlyCounts(notes, () => true, monthsCount)} />
        </SectionCard>

        <SectionCard title="Incident / behaviour mentions over time" hint="notes flagged as incident/behaviour">
          <VerticalBars series={monthlyCounts(notes, (n) => !!n.incident_flagged, monthsCount)} />
        </SectionCard>

        <SectionCard title="Presentation themes mentioned" hint="mood/presentation words recorded in notes">
          <BarList items={moodThemes(notes).map((m) => ({ label: m.label, value: m.value }))} emptyLabel="No presentation themes recorded yet." />
        </SectionCard>

        <SectionCard title="Support categories used" hint="support type recorded on notes">
          <BarList items={supportCategories(notes).map((s) => ({ label: s.label, value: s.value }))} emptyLabel="No support categories recorded yet." />
        </SectionCard>

        <SectionCard title="Goals worked on" hint="goals referenced in notes">
          <BarList items={topGoals(notes).map((g) => ({ label: g.label, value: g.value }))} emptyLabel="No goals referenced in notes yet." />
        </SectionCard>

        <SectionCard title="Notes needing review" hint="pending approval or flagged for review">
          <div className="space-y-3">
            <StatTile label="Areas to review" value={reviewCount} sub="across the current filter" tone={reviewCount ? "amber" : "teal"} />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <div><p className="text-lg font-bold text-slate-800">{concernCount}</p><p className="text-[11px] text-slate-500">concern mentions</p></div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-aria-500" />
                <div><p className="text-lg font-bold text-slate-800">{followUpCount}</p><p className="text-[11px] text-slate-500">follow-up mentions</p></div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

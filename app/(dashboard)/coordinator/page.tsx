import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, BarChart3, AlertTriangle, ClipboardCheck, CalendarClock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { MiniBars } from "@/components/insights/Charts";
import ExportButtons from "@/components/insights/ExportButtons";
import { NoteRow, participantSnapshot } from "@/lib/insights/aggregate";
import ReviewInbox from "@/components/review/ReviewInbox";

export const metadata = { title: "Coordinator overview | Aria" };

export default async function CoordinatorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, account_type, organisation_id, organisations(name, product_mode, subscription_tier)")
    .eq("id", user.id)
    .single();

  const org = (Array.isArray(profile?.organisations) ? profile?.organisations[0] : profile?.organisations) as { name?: string; product_mode?: string; subscription_tier?: string } | undefined;
  const isSolo = profile?.account_type === "solo" || org?.product_mode === "solo" || (org?.subscription_tier?.startsWith("solo") ?? false);
  if (isSolo) redirect("/dashboard");
  if (!["owner", "coordinator"].includes(profile?.role ?? "")) redirect("/dashboard");

  const orgId = profile?.organisation_id;

  const [{ data: participantRows }, { data: rawNotes }] = await Promise.all([
    supabase.from("participants").select("id, full_name, support_category").eq("organisation_id", orgId).eq("status", "active").order("full_name"),
    supabase.from("progress_notes")
      .select("id, participant_id, author_id, author_name, created_at, shift_date, note_text, mood, support_type, support_level, incident_flagged, suggested_review, suggested_review_reason, status, goals_referenced")
      .eq("organisation_id", orgId).order("created_at", { ascending: false }).limit(2000),
  ]);

  const notes = (rawNotes ?? []) as NoteRow[];
  const participants = participantRows ?? [];
  const participantName = new Map(participants.map((p) => [p.id, p.full_name]));
  const pendingItems = notes
    .filter((n) => n.status === "pending")
    .slice(0, 50)
    .map((n) => ({
      id: n.id,
      participantId: n.participant_id,
      participant: (n.participant_id && participantName.get(n.participant_id)) || "Unknown participant",
      date: formatDate(n.shift_date ?? n.created_at),
      author: n.author_name ?? "",
      snippet: (n.note_text ?? "").slice(0, 160),
      incident: !!n.incident_flagged,
    }));

  const snapshots = participants
    .map((p) => ({ participant: p, snap: participantSnapshot(p.id, notes) }))
    .sort((a, b) => {
      const at = a.snap.lastNoteDate ? new Date(a.snap.lastNoteDate).getTime() : 0;
      const bt = b.snap.lastNoteDate ? new Date(b.snap.lastNoteDate).getTime() : 0;
      return bt - at;
    });

  const csvRows = snapshots.map(({ participant, snap }) => ({
    participant: participant.full_name,
    last_note_date: snap.lastNoteDate ? formatDate(snap.lastNoteDate) : "No notes",
    total_notes: snap.totalNotes,
    recent_concerns: snap.recentConcerns,
    follow_up_needed: snap.followUpNeeded,
    needs_review: snap.needsReview,
  }));

  const summaryText = [
    `Coordinator overview — ${org?.name ?? "Organisation"} (${formatDate(new Date().toISOString())})`,
    "Support activity overview from recorded notes. Drafts/themes only — review before any formal use.",
    "",
    ...snapshots.map(({ participant, snap }) =>
      `${participant.full_name}\n  Last note: ${snap.lastNoteDate ? formatDate(snap.lastNoteDate) : "No notes yet"}  |  Notes: ${snap.totalNotes}  |  Concern mentions: ${snap.recentConcerns}  |  Follow-up: ${snap.followUpNeeded}  |  To review: ${snap.needsReview}\n  Latest: ${snap.latestSummary || "—"}`
    ),
  ].join("\n");

  return (
    <div className="p-6 max-w-6xl space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap print:block">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-aria-600" /> Coordinator overview
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">A per-participant snapshot from recorded notes — for review and handover, not clinical assessment.</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Link href="/insights" className="btn-secondary text-sm"><BarChart3 className="w-4 h-4" /> Trends</Link>
          <ExportButtons rows={csvRows} filename={`coordinator-overview-${new Date().toISOString().slice(0, 10)}.csv`} summaryText={summaryText} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500 print:hidden">
        These snapshots summarise what was recorded in progress notes. Review the underlying notes before acting — they do not diagnose or measure outcomes.
      </div>

      <ReviewInbox items={pendingItems} />

      {snapshots.length === 0 ? (
        <div className="card p-12 text-center border-dashed">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No active participants yet. Add participants to see a coordinator overview.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {snapshots.map(({ participant, snap }) => (
            <div key={participant.id} className="card p-5 break-inside-avoid">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/participants/${participant.id}`} className="font-display font-bold text-slate-900 hover:text-aria-700">{participant.full_name}</Link>
                    {participant.support_category && <span className="badge text-[10px] bg-slate-100 text-slate-500">{participant.support_category}</span>}
                    <Link href={`/report/participant/${participant.id}`} target="_blank" className="text-[11px] font-bold text-aria-700 hover:underline">Audit report &rarr;</Link>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5" />
                    {snap.lastNoteDate ? `Last note ${formatDate(snap.lastNoteDate)}` : "No notes yet"} · {snap.totalNotes} note{snap.totalNotes === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">8-week trend</p>
                    <div className="w-28"><MiniBars series={snap.weeklyTrend} /></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                <Pill icon={AlertTriangle} label="Concern mentions" value={snap.recentConcerns} tone={snap.recentConcerns ? "red" : "slate"} />
                <Pill icon={ClipboardCheck} label="Follow-up needed" value={snap.followUpNeeded} tone={snap.followUpNeeded ? "amber" : "slate"} />
                <Pill icon={ClipboardCheck} label="To review" value={snap.needsReview} tone={snap.needsReview ? "amber" : "slate"} />
                <Pill icon={BarChart3} label="Total notes" value={snap.totalNotes} tone="slate" />
              </div>

              {snap.latestSummary && (
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Latest recorded note</p>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{snap.latestSummary}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number; tone: "red" | "amber" | "slate" }) {
  const toneClass = tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : "text-slate-700";
  return (
    <div className="rounded-xl border border-slate-200 p-2.5 flex items-center gap-2">
      <Icon className={`w-4 h-4 flex-shrink-0 ${value ? toneClass : "text-slate-300"}`} />
      <div className="min-w-0">
        <p className={`text-lg font-bold leading-none ${value ? toneClass : "text-slate-400"}`}>{value}</p>
        <p className="text-[10px] text-slate-500 truncate">{label}</p>
      </div>
    </div>
  );
}

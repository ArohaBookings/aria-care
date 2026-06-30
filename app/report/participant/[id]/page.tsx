import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, ClipboardCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";
import PrintButton from "@/components/report/PrintButton";
import { NoteRow, isConcern, hasFollowUp, needsReview } from "@/lib/insights/aggregate";

export const metadata = { title: "Participant report | Aria" };

const RANGE_DAYS: Record<string, number | null> = { "30": 30, "90": 90, "180": 180, "365": 365, all: null };
const RANGE_LABEL: Record<string, string> = { "30": "Last 30 days", "90": "Last 90 days", "180": "Last 6 months", "365": "Last 12 months", all: "All time" };

export default async function ParticipantReport({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, account_type, organisation_id, full_name, organisations(name, product_mode, subscription_tier)")
    .eq("id", user.id)
    .single();

  const org = (Array.isArray(profile?.organisations) ? profile?.organisations[0] : profile?.organisations) as { name?: string; product_mode?: string; subscription_tier?: string } | undefined;
  const isSolo = profile?.account_type === "solo" || org?.product_mode === "solo" || (org?.subscription_tier?.startsWith("solo") ?? false);
  if (isSolo) redirect("/dashboard");
  if (!["owner", "coordinator"].includes(profile?.role ?? "")) redirect("/dashboard");

  const { data: participant } = await supabase
    .from("participants")
    .select("id, full_name, preferred_name, ndis_number, date_of_birth, primary_disability, support_category, goals, plan_start_date, plan_end_date")
    .eq("id", id)
    .eq("organisation_id", profile?.organisation_id)
    .single();
  if (!participant) notFound();

  const rangeKey = typeof sp.range === "string" && sp.range in RANGE_DAYS ? sp.range : "365";
  const days = RANGE_DAYS[rangeKey];
  const fromIso = days ? new Date(Date.now() - days * 86400000).toISOString() : null;

  let query = supabase
    .from("progress_notes")
    .select("id, participant_id, author_id, author_name, created_at, shift_date, note_text, mood, support_type, support_level, incident_flagged, suggested_review, suggested_review_reason, status, goals_referenced")
    .eq("participant_id", id)
    .eq("organisation_id", profile?.organisation_id)
    .order("shift_date", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1000);
  if (fromIso) query = query.gte("created_at", fromIso);
  const { data: rawNotes } = await query;

  const { data: structuredGoals } = await supabase
    .from("participant_goals")
    .select("goal_text, goal_type, status")
    .eq("participant_id", id)
    .eq("organisation_id", profile?.organisation_id);

  const notes = (rawNotes ?? []) as NoteRow[];
  const incidentCount = notes.filter((n) => n.incident_flagged).length;
  const concernCount = notes.filter(isConcern).length;
  const followUpCount = notes.filter(hasFollowUp).length;
  const reviewCount = notes.filter(needsReview).length;
  const goalList = (structuredGoals ?? []).map((g) => g.goal_text).concat(participant.goals ?? []).filter(Boolean);
  const displayName = participant.preferred_name || participant.full_name;

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white py-8 px-4 print:p-0">
      <div className="max-w-3xl mx-auto">
        {/* Action bar (hidden on print) */}
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Link href={`/participants/${id}`} className="btn-secondary text-sm"><ArrowLeft className="w-4 h-4" /> Back</Link>
          <div className="flex items-center gap-2">
            <form className="flex items-center gap-2">
              <select name="range" defaultValue={rangeKey} className="input text-sm py-1.5" >
                {Object.entries(RANGE_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <button className="btn-secondary text-sm" type="submit">Apply</button>
            </form>
            <PrintButton />
          </div>
        </div>

        {/* The report */}
        <div className="bg-white rounded-2xl print:rounded-none shadow-sm print:shadow-none border border-slate-200 print:border-0 p-8 print:p-0">
          <header className="border-b border-slate-200 pb-4 mb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-aria-700">{org?.name ?? "Organisation"}</p>
                <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">Participant Support Report</h1>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>Generated {formatDate(new Date().toISOString())}</p>
                <p>{RANGE_LABEL[rangeKey]}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <Field label="Participant" value={displayName} />
              {participant.ndis_number && <Field label="NDIS number" value={participant.ndis_number} />}
              {participant.support_category && <Field label="Support category" value={participant.support_category} />}
              {participant.date_of_birth && <Field label="Date of birth" value={formatDate(participant.date_of_birth)} />}
            </div>
          </header>

          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 mb-5 text-[11px] text-slate-500">
            Compiled from recorded progress notes for review and plan-review/handover purposes. This is a record of what was documented — it is not a clinical assessment, an outcome measure, or a guarantee of NDIS compliance. Review the underlying notes before any formal use.
          </div>

          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Stat label="Notes in range" value={notes.length} />
            <Stat label="Incident/behaviour" value={incidentCount} tone={incidentCount ? "red" : "slate"} />
            <Stat label="Concern mentions" value={concernCount} tone={concernCount ? "amber" : "slate"} />
            <Stat label="Follow-up mentions" value={followUpCount} tone={followUpCount ? "amber" : "slate"} />
          </section>

          {goalList.length > 0 && (
            <section className="mb-6">
              <h2 className="font-display font-bold text-slate-900 text-sm mb-2">Participant goals</h2>
              <ul className="space-y-1">
                {goalList.slice(0, 12).map((g, i) => (
                  <li key={i} className="text-xs text-slate-700 flex items-start gap-2"><span className="text-aria-500 mt-0.5">•</span>{g}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="font-display font-bold text-slate-900 text-sm mb-3">Recorded notes ({notes.length})</h2>
            {notes.length === 0 ? (
              <p className="text-xs text-slate-400">No notes recorded in this period.</p>
            ) : (
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.id} className="border border-slate-200 rounded-lg p-3 break-inside-avoid">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-xs font-bold text-slate-800">{formatDate(n.shift_date ?? n.created_at)}{n.author_name ? ` · ${n.author_name}` : ""}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {n.support_type && <span className="text-[10px] text-slate-500">{n.support_type}</span>}
                        {n.incident_flagged && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600"><AlertTriangle className="w-3 h-3" /> Incident</span>}
                        {n.status === "pending" && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600"><ClipboardCheck className="w-3 h-3" /> To review</span>}
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{n.note_text}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <footer className="mt-6 pt-4 border-t border-slate-200 text-[10px] text-slate-400">
            Aria Care · Draft records for review · {reviewCount} note{reviewCount === 1 ? "" : "s"} still pending review at time of generation. Follow your organisation&apos;s policies and the NDIS reporting process.
          </footer>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-slate-800 font-medium">{value}</p>
    </div>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: number; tone?: "red" | "amber" | "slate" }) {
  const toneClass = tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : "text-slate-800";
  return (
    <div className="rounded-lg border border-slate-200 p-2.5 text-center">
      <p className={`font-display text-2xl font-bold ${toneClass}`}>{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

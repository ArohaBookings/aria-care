import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Mic, Clock, Edit, AlertCircle } from "lucide-react";
import { formatDate, daysUntil } from "@/lib/utils";

export default async function ParticipantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: participant } = await supabase.from("participants").select("*").eq("id", id).single();
  if (!participant) notFound();

  const { data: notes } = await supabase
    .from("progress_notes")
    .select("id, created_at, note_text, status, author_name, support_type")
    .eq("participant_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: incidents } = await supabase
    .from("incident_reports")
    .select("id, incident_date, incident_type, severity, status")
    .eq("participant_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  const planDays = participant.plan_end_date ? daysUntil(participant.plan_end_date) : null;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/participants" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> All participants
        </Link>
        <Link href={`/participants/${id}/edit`} className="btn-secondary text-sm">
          <Edit className="w-3.5 h-3.5" /> Edit
        </Link>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-aria-gradient flex items-center justify-center text-xl font-bold text-white">
              {participant.full_name.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">{participant.full_name}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                {participant.ndis_number && <span className="text-sm font-mono text-slate-500">NDIS: {participant.ndis_number}</span>}
                {participant.primary_disability && <span className="text-sm text-slate-500">· {participant.primary_disability}</span>}
                <span className={participant.status === "active" ? "badge-green" : "badge-slate"}>{participant.status}</span>
              </div>
            </div>
          </div>
          <Link href="/notes?new=1" className="btn-primary self-start md:self-auto">
            <Mic className="w-4 h-4" /> New voice note
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="card p-5">
          <p className="section-title mb-3">Plan Status</p>
          <div className="space-y-2">
            {participant.plan_end_date && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">Plan ends</span>
                  {planDays !== null && planDays <= 30 && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                </div>
                <p className={`font-semibold text-sm ${planDays !== null && planDays <= 30 ? "text-amber-700" : "text-slate-900"}`}>
                  {formatDate(participant.plan_end_date)}
                  {planDays !== null && planDays <= 60 && <span className="text-xs font-normal ml-1">({planDays}d)</span>}
                </p>
              </div>
            )}
            {participant.funding_remaining_pct !== null && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">Funding</span>
                  <span className={`text-xs font-bold ${participant.funding_remaining_pct <= 20 ? "text-red-600" : participant.funding_remaining_pct <= 40 ? "text-amber-600" : "text-emerald-600"}`}>
                    {participant.funding_remaining_pct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${participant.funding_remaining_pct > 40 ? "bg-emerald-500" : participant.funding_remaining_pct > 20 ? "bg-amber-400" : "bg-red-500"}`}
                    style={{ width: `${participant.funding_remaining_pct}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <p className="section-title mb-3">Contact</p>
          <div className="space-y-1.5 text-sm">
            {participant.email && <div><span className="text-slate-500">Email: </span><span>{participant.email}</span></div>}
            {participant.phone && <div><span className="text-slate-500">Phone: </span><span>{participant.phone}</span></div>}
            {participant.address && <div><span className="text-slate-500">Address: </span><span>{participant.address}</span></div>}
            {participant.emergency_contact_name && (
              <div className="pt-2 border-t border-slate-100 mt-2">
                <p className="text-xs font-semibold text-slate-500 mb-1">Emergency Contact</p>
                <p>{participant.emergency_contact_name}</p>
                {participant.emergency_contact_phone && <p className="text-slate-600">{participant.emergency_contact_phone}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <p className="section-title mb-3">Activity</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="font-display text-2xl font-bold text-slate-900">{notes?.length ?? 0}</p>
              <p className="text-xs text-slate-500">Notes</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="font-display text-2xl font-bold text-slate-900">{incidents?.length ?? 0}</p>
              <p className="text-xs text-slate-500">Incidents</p>
            </div>
            <div className="col-span-2 bg-aria-50 border border-aria-100 rounded-xl p-3 text-center">
              <p className="text-xs font-semibold text-aria-700">{participant.support_category ?? "Daily Activities"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-900 text-sm">Recent Progress Notes</h3>
          </div>
          <Link href={`/notes?participant=${id}`} className="text-xs text-aria-600 hover:underline font-semibold">View all →</Link>
        </div>
        {!notes?.length ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No notes yet. <Link href="/notes?new=1" className="text-aria-600 font-semibold">Record the first one →</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notes.map(note => (
              <div key={note.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(note.created_at)}</span>
                  <span className={note.status === "approved" ? "badge-green" : note.status === "pending" ? "badge-yellow" : "badge-slate"}>{note.status}</span>
                </div>
                <p className="text-sm text-slate-700 line-clamp-2">{note.note_text}</p>
                {note.author_name && <p className="text-xs text-slate-400 mt-1">By {note.author_name}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User, Calendar, Mic, FileText, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import NoteEditor from "./note-editor";

export const metadata = { title: "Note | Aria" };

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: note } = await supabase
    .from("progress_notes")
    .select(`
      id, created_at, shift_date, shift_start, shift_end,
      note_text, raw_input, input_method, status,
      goals_referenced, support_level, mood,
      incident_flagged, suggested_review, suggested_review_reason,
      author_id, author_name,
      approved_by, approved_at,
      participant_id,
      participants(id, full_name, ndis_number, primary_disability)
    `)
    .eq("id", id)
    .single();

  if (!note) notFound();

  // Approver name (separate lookup — RLS-safe)
  let approverName: string | null = null;
  if (note.approved_by) {
    const { data: approver } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", note.approved_by)
      .single();
    approverName = approver?.full_name || approver?.email || null;
  }

  const participant = Array.isArray(note.participants) ? note.participants[0] : note.participants;

  return (
    <div className="p-6 max-w-4xl">
      <Link href="/notes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> All notes
      </Link>

      {/* header */}
      <div className="card p-6 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={note.status === "approved" ? "badge-green" : note.status === "pending" ? "badge-yellow" : "badge-slate"}>
                {note.status}
              </span>
              {note.incident_flagged && <span className="badge-red">Incident flagged</span>}
              {note.suggested_review && <span className="badge-yellow">Review suggested</span>}
            </div>
            <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Progress note</h1>
            {participant && (
              <Link href={`/participants/${participant.id}`} className="inline-flex items-center gap-1.5 text-sm text-aria-700 hover:underline">
                <User className="w-3.5 h-3.5" /> {participant.full_name}
              </Link>
            )}
          </div>
          <div className="text-right text-xs text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 justify-end"><Calendar className="w-3.5 h-3.5" /> {formatDate(note.created_at)}</div>
            {note.author_name && <div>By {note.author_name}</div>}
            <div className="flex items-center gap-1.5 justify-end">
              {note.input_method === "voice" ? <Mic className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
              {note.input_method}
            </div>
          </div>
        </div>

        {(note.goals_referenced?.length || note.support_level || note.mood) && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-600">
            {note.mood && <div><span className="font-semibold text-slate-500">Mood:</span> {note.mood}</div>}
            {note.support_level && <div><span className="font-semibold text-slate-500">Support level:</span> {note.support_level}</div>}
            {note.goals_referenced?.length ? (
              <div>
                <span className="font-semibold text-slate-500">Goals referenced:</span>{" "}
                {note.goals_referenced.join(", ")}
              </div>
            ) : null}
          </div>
        )}

        {note.approved_by && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle className="w-3.5 h-3.5" /> Approved {note.approved_at ? `on ${formatDate(note.approved_at)}` : ""}
            {approverName && ` by ${approverName}`}
          </div>
        )}
      </div>

      {/* editable note body — client component */}
      <NoteEditor
        noteId={note.id}
        initialText={note.note_text}
        initialStatus={note.status}
        rawInput={note.raw_input}
      />
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function NoteEditor({
  noteId,
  initialText,
  initialStatus,
  rawInput,
}: {
  noteId: string;
  initialText: string;
  initialStatus: string;
  rawInput: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  const save = async () => {
    setSaving(true);
    setErr("");
    setSaved(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("progress_notes")
      .update({
        note_text: text,
        status,
        approved_by: status === "approved" ? user?.id ?? null : null,
        approved_at: status === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", noteId);

    setSaving(false);
    if (error) {
      setErr(error.message);
    } else {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Note text</h2>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          className="input resize-y font-mono text-sm"
        />
        {err && (
          <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {err}
          </div>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button onClick={save} disabled={saving} className="btn-primary py-2.5 px-5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save{status === "approved" ? " & approve" : ""}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>
      </div>

      {rawInput && (
        <div className="card overflow-hidden">
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-700">
              Original voice transcript
            </span>
            {showRaw ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showRaw && (
            <div className="px-5 pb-5">
              <pre className="text-xs text-slate-600 bg-slate-50 rounded-xl p-4 whitespace-pre-wrap font-mono border border-slate-100">
                {rawInput}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";
import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, Check, X, ChevronDown, ChevronUp, Copy, AlertTriangle, FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";

type RecordingState = "idle" | "recording" | "processing" | "done" | "error";

interface GeneratedNote {
  noteText: string;
  goalsReferenced: string[];
  supportLevel: string;
  mood: string;
  incidentFlagged: boolean;
  suggestedReview: boolean;
  suggestedReviewReason: string;
}

interface SavedNote {
  id: string;
  created_at: string;
  note_text: string;
  status: string;
  mood: string;
  incident_flagged: boolean;
  support_level: string;
  author_name: string;
  participants: { full_name: string };
}

export default function NotesPage() {
  const [state, setState] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState("");
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [textInput, setTextInput] = useState("");
  const [participants, setParticipants] = useState<{ id: string; full_name: string; goals: string[] }[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [generated, setGenerated] = useState<GeneratedNote | null>(null);
  const [error, setError] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved">("all");

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadParticipants();
    loadNotes();
  }, []);

  const loadParticipants = async () => {
    const { data } = await supabase.from("participants").select("id, full_name, goals").eq("status", "active").order("full_name");
    setParticipants(data ?? []);
  };

  const loadNotes = async () => {
    const { data } = await supabase.from("progress_notes")
      .select("id, created_at, note_text, status, mood, incident_flagged, support_level, author_name, participants(full_name)")
      .order("created_at", { ascending: false }).limit(30);
    setNotes((data as unknown as SavedNote[]) ?? []);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = handleAudioStop;
      mediaRecorder.current.start();
      setState("recording");
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      setError("Microphone access denied. Please allow microphone access and try again.");
      setState("error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setState("processing");
  };

  const handleAudioStop = async () => {
    const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
    setState("processing");
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Transcription failed");
      }
      const { transcript: t } = await res.json();
      setTranscript(t);
      await generateNote(t);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Transcription failed. Please use text mode.");
      setState("error");
    }
  };

  const generateNote = async (input: string) => {
    setState("processing");
    setError("");
    const participant = participants.find(p => p.id === selectedParticipant);
    try {
      const res = await fetch("/api/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: input,
          participantId: selectedParticipant,
          participantName: participant?.full_name ?? "Unknown",
          participantGoals: participant?.goals ?? [],
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setGenerated(data.note);
      setState("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setState("error");
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setTranscript(textInput);
    await generateNote(textInput);
  };

  const saveNote = async () => {
    if (!generated) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("users").select("full_name, organisation_id, role").eq("id", user!.id).single();
    await supabase.from("progress_notes").insert({
      organisation_id: profile?.organisation_id,
      participant_id: selectedParticipant || null,
      author_id: user?.id,
      author_name: profile?.full_name ?? "Unknown",
      raw_input: transcript,
      note_text: generated.noteText,
      goals_referenced: generated.goalsReferenced,
      support_level: generated.supportLevel,
      mood: generated.mood,
      incident_flagged: generated.incidentFlagged,
      suggested_review: generated.suggestedReview,
      suggested_review_reason: generated.suggestedReviewReason,
      input_method: inputMode,
      status: profile?.role === "support_worker" ? "pending" : "approved",
    });
    setSaving(false); setSaved(true);
    setTimeout(() => { setSaved(false); setState("idle"); setGenerated(null); setTextInput(""); setTranscript(""); }, 2000);
    loadNotes();
  };

  const approveNote = async (noteId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("progress_notes").update({ status: "approved", approved_by: user?.id, approved_at: new Date().toISOString() }).eq("id", noteId);
    loadNotes();
  };

  const filteredNotes = notes.filter(n => filterStatus === "all" || n.status === filterStatus);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="p-6 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recorder panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <h2 className="font-display font-bold text-slate-900 text-lg mb-1">New Progress Note</h2>
            <p className="text-xs text-slate-500 mb-5">Record voice or type bullet points</p>

            {/* Participant selector */}
            <div className="mb-4">
              <label className="label">Participant</label>
              <select value={selectedParticipant} onChange={e => setSelectedParticipant(e.target.value)} className="input">
                <option value="">Select participant...</option>
                {participants.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-xl border border-slate-200 p-0.5 mb-5 bg-slate-50">
              {(["voice", "text"] as const).map(m => (
                <button key={m} onClick={() => setInputMode(m)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${inputMode === m ? "bg-white text-slate-900 shadow-card" : "text-slate-500"}`}>{m}</button>
              ))}
            </div>

            {inputMode === "voice" ? (
              <div className="text-center py-6">
                {state === "idle" && (
                  <button onClick={startRecording} className="w-20 h-20 rounded-full bg-aria-600 hover:bg-aria-700 flex items-center justify-center mx-auto shadow-teal transition-all hover:scale-105 active:scale-95">
                    <Mic className="w-8 h-8 text-white" />
                  </button>
                )}
                {state === "recording" && (
                  <div className="space-y-4">
                    <button onClick={stopRecording} className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center mx-auto recording-pulse transition-all">
                      <Square className="w-8 h-8 text-white fill-white" />
                    </button>
                    <div className="flex items-end justify-center gap-0.5 h-8">
                      {[...Array(6)].map((_, i) => <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />)}
                    </div>
                    <p className="text-2xl font-mono font-bold text-slate-900">{fmt(recordingTime)}</p>
                    <p className="text-xs text-slate-500">Recording... tap to stop</p>
                  </div>
                )}
                {state === "processing" && (
                  <div className="space-y-3">
                    <Loader2 className="w-10 h-10 animate-spin text-aria-500 mx-auto" />
                    <p className="text-sm font-medium text-slate-700">Aria is writing your note...</p>
                    <p className="text-xs text-slate-400">Usually takes 5–10 seconds</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder="Bullet points work great:&#10;• Marcus was in good spirits today&#10;• Completed meal prep independently&#10;• Brief anxiety episode around 10am, managed with breathing&#10;• No incidents to report"
                  rows={8}
                  className="input resize-none font-body text-sm leading-relaxed"
                />
                <button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim() || state === "processing" || !selectedParticipant}
                  className="btn-primary w-full justify-center disabled:opacity-50"
                >
                  {state === "processing" ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : "Generate Note"}
                </button>
              </div>
            )}

            {error && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>
            )}
          </div>

          {/* Generated note preview */}
          {generated && state === "done" && (
            <div className="card p-6 border-aria-200 bg-aria-50/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 text-sm">Generated Note</h3>
                <div className="flex gap-2">
                  <span className="badge-green text-[10px]">NDIS Compliant</span>
                  {generated.incidentFlagged && <span className="badge-red text-[10px]">⚠ Incident</span>}
                </div>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap mb-4">{generated.noteText}</p>
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <div><span className="text-slate-500">Support level: </span><span className="font-medium capitalize">{generated.supportLevel}</span></div>
                <div><span className="text-slate-500">Mood: </span><span className="font-medium capitalize">{generated.mood}</span></div>
              </div>
              <button onClick={saveNote} disabled={saving || saved} className="btn-primary w-full justify-center">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save & File Note"}
              </button>
            </div>
          )}
        </div>

        {/* Notes list */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-slate-900">Note History</h3>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-0.5">
              {(["all", "pending", "approved"] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filterStatus === s ? "bg-white text-slate-900 shadow-card" : "text-slate-500"}`}>{s}</button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredNotes.length === 0 ? (
              <div className="card p-16 text-center border-dashed">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No notes yet</p>
              </div>
            ) : filteredNotes.map(note => (
              <div key={note.id} className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpanded(expanded === note.id ? null : note.id)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${note.status === "approved" ? "bg-emerald-500" : "bg-amber-400"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{note.participants?.full_name ?? "Unknown Participant"}</p>
                      <p className="text-xs text-slate-400">{timeAgo(note.created_at)} · by {note.author_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {note.incident_flagged && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    <span className={`badge text-[10px] ${note.status === "approved" ? "badge-green" : "badge-yellow"}`}>{note.status}</span>
                    {expanded === note.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
                {expanded === note.id && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-4">{note.note_text}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {note.status === "pending" && (
                        <button onClick={() => approveNote(note.id)} className="btn-primary text-xs py-1.5 px-4">
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                      <button onClick={() => navigator.clipboard.writeText(note.note_text)} className="btn-secondary text-xs py-1.5 px-4">
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

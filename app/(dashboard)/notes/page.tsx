"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mic, Square, Loader2, Check, ChevronDown, ChevronUp, Copy, AlertTriangle, FileText, ArrowRight, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";
import SoloNotesExperience from "@/components/solo/SoloNotesExperience";
import { detectCareSignals, scoreNoteQuality } from "@/lib/notes/quality";
import {
  AdaptiveDebriefPanel,
  DignityRiskGuardian,
  EvidencePackPanel,
  GoalLinkPanel,
  UniversalPlatformBridge,
  copyTextWithFallback,
} from "@/components/notes/NoteIntelligencePanels";
import { buildAdaptiveDebriefQuestions } from "@/lib/notes/intelligence";

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
  participant_id: string;
  created_at: string;
  note_text: string;
  status: string;
  mood: string;
  incident_flagged: boolean;
  support_level: string;
  author_name: string;
  participants: { full_name: string };
}

type UpgradePrompt = {
  message: string;
  href: string;
  label: string;
} | null;

const OPTIONAL_DETAILS_CHECKLIST = [
  "Shift time",
  "Participant mood on arrival",
  "Any follow-up for next worker",
  "Whether family/admin were notified",
  "Any changes in risk, health, behaviour, or routine",
];

function makeDraftShorter(text: string) {
  return text
    .split(/\n{2,}/)
    .filter((section) => section.trim())
    .slice(0, 5)
    .join("\n\n")
    .trim();
}

function addMissingDetailsChecklist(text: string) {
  if (text.includes("Optional details you may want to add:")) return text;
  return `${text.trim()}

Optional details you may want to add:
${OPTIONAL_DETAILS_CHECKLIST.map((item) => `- ${item}`).join("\n")}`;
}

function makeDraftMoreProfessional(text: string) {
  return text
    .replace(/\butilized\b/gi, "used")
    .replace(/\bproceeded comfortably\b/gi, "continued without concerns noted")
    .replace(/\bdemonstrated significant improvement\b/gi, "showed progress")
    .replace(/\bit is recommended\b/gi, "follow up")
    .replace(/\bnon-compliant\b/gi, "did not engage with the task at that time")
    .replace(/\brefused\b/gi, "declined")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function makeDraftShiftCareReady(text: string) {
  return text
    .replace(/\*\*/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function QualityPanel({ text }: { text: string }) {
  const quality = scoreNoteQuality(text, "progress");
  const signals = detectCareSignals(text);
  const scoreColor = quality.score >= 90 ? "text-emerald-600" : quality.score >= 75 ? "text-aria-600" : quality.score >= 55 ? "text-amber-600" : "text-red-600";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Documentation quality score</p>
          <p className="text-xs text-slate-600 mt-1">{quality.label} · review before filing</p>
        </div>
        <p className={`font-display text-3xl font-bold ${scoreColor}`}>{quality.score}</p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-aria-gradient transition-all duration-500" style={{ width: `${quality.score}%` }} />
      </div>
      {signals.length > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {signals.slice(0, 4).map((signal) => (
            <div key={signal.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <p className={`text-xs font-bold ${signal.level === "risk" ? "text-red-600" : signal.level === "watch" ? "text-amber-700" : "text-aria-700"}`}>{signal.label}</p>
              <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{signal.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  return [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function audioExtensionFromMimeType(type: string) {
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  return "webm";
}

async function fetchParticipants() {
  const supabase = createClient();
  const { data } = await supabase
    .from("participants")
    .select("id, full_name, goals")
    .eq("status", "active")
    .order("full_name");

  return data ?? [];
}

async function fetchNotesAndRole() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role = "support_worker";
  let accountMode: "provider" | "solo" = "provider";
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role, account_type, organisations(subscription_tier, product_mode)")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? "support_worker";

    const org = profile?.organisations as { subscription_tier?: string; product_mode?: string } | null;
    if (profile?.account_type === "solo" || org?.product_mode === "solo" || org?.subscription_tier?.startsWith("solo")) {
      accountMode = "solo";
    }
  }

  if (accountMode === "solo") {
    return {
      role,
      accountMode,
      notes: [],
    };
  }

  const { data } = await supabase
    .from("progress_notes")
    .select("id, participant_id, created_at, note_text, status, mood, incident_flagged, support_level, author_name, participants(full_name)")
    .order("created_at", { ascending: false })
    .limit(30);

  return {
    role,
    accountMode,
    notes: (data as unknown as SavedNote[]) ?? [],
  };
}

export default function NotesPage() {
  const searchParams = useSearchParams();
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
  const [upgradePrompt, setUpgradePrompt] = useState<UpgradePrompt>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved">("all");
  const [viewerRole, setViewerRole] = useState("support_worker");
  const [accountMode, setAccountMode] = useState<"loading" | "provider" | "solo">("loading");
  const [draftActionNotice, setDraftActionNotice] = useState("");
  const [copiedGenerated, setCopiedGenerated] = useState(false);
  const [debriefAnswers, setDebriefAnswers] = useState<Record<string, string>>({});
  const [ocrLoading, setOcrLoading] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();
  const selectedParticipantData = participants.find((participant) => participant.id === selectedParticipant);
  const debriefInput = inputMode === "voice" ? transcript || textInput : textInput || transcript;
  const debriefQuestions = buildAdaptiveDebriefQuestions(
    debriefInput,
    {
      goals: selectedParticipantData?.goals?.join("; ") ?? "",
      debriefAnswers,
    },
    "progress"
  );

  useEffect(() => {
    (async () => {
      const noteState = await fetchNotesAndRole();

      setViewerRole(noteState.role);
      setAccountMode(noteState.accountMode);
      setNotes(noteState.notes);

      if (noteState.accountMode === "provider") {
        setParticipants(await fetchParticipants());
      }
    })();
  }, []);

  useEffect(() => {
    const participant = searchParams.get("participant");
    const status = searchParams.get("status");

    if (participant) {
      setSelectedParticipant(participant);
    }

    if (status === "pending" || status === "approved" || status === "all") {
      setFilterStatus(status);
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorder.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const loadNotes = async () => {
    const { role, notes: latestNotes } = await fetchNotesAndRole();
    setViewerRole(role);
    setNotes(latestNotes);
  };

  const startRecording = async () => {
    if (!selectedParticipant) {
      setError("Please select a participant before recording.");
      return;
    }

    try {
      setError("");
      setUpgradePrompt(null);
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Your browser does not support in-browser recording. Please use text mode for this note.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      mediaRecorder.current = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = handleAudioStop;
      mediaRecorder.current.start();
      setState("recording");
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Microphone access denied. Please allow microphone access and try again.";
      setError(`${message} You can still use text mode and type bullet points for this note.`);
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
    const mimeType = mediaRecorder.current?.mimeType || "audio/webm";
    if (audioChunks.current.length === 0) {
      setError("No audio was captured. Check the microphone, move closer, or switch to text mode for a reliable fallback.");
      setState("error");
      return;
    }
    const audioBlob = new Blob(audioChunks.current, { type: mimeType });
    setState("processing");
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, `recording.${audioExtensionFromMimeType(mimeType)}`);
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Transcription failed");
      }
      const { transcript: t } = await res.json();
      setTranscript(t);
      await generateNote(t);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Transcription failed.";
      setError(`${message} Please use text mode if the microphone or transcription service is unavailable.`);
      setState("error");
    }
  };

  const generateNote = async (input: string) => {
    setState("processing");
    setError("");
    setUpgradePrompt(null);
    setDraftActionNotice("");
    setCopiedGenerated(false);
    const participant = participants.find(p => p.id === selectedParticipant);
    const answeredDebrief = Object.entries(debriefAnswers)
      .filter(([, value]) => value.trim())
      .map(([key, value]) => `${key}: ${value.trim()}`);
    const sourceInput = answeredDebrief.length
      ? `${input.trim()}

Adaptive debrief answers:
${answeredDebrief.join("\n")}`
      : input;
    setTranscript(sourceInput);
    try {
      const res = await fetch("/api/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: sourceInput,
          participantId: selectedParticipant,
          participantName: participant?.full_name ?? "Unknown",
          participantGoals: participant?.goals ?? [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "NOTE_LIMIT_REACHED") {
          const planLabel = data.upgradePlan ? `Upgrade to ${data.upgradePlan}` : "Manage billing";
          setUpgradePrompt({
            message: data.error ?? "You have reached your AI note generation limit.",
            href: data.upgradeUrl ?? "/billing",
            label: planLabel,
          });
        }
        throw new Error(data.error ?? "Generation failed");
      }
      setGenerated(data.note);
      setState("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setState("error");
    }
  };

  const handleTextSubmit = async () => {
    if (!selectedParticipant) {
      setError("Please select a participant before generating a note.");
      return;
    }
    if (!textInput.trim()) return;
    setTranscript(textInput);
    await generateNote(textInput);
  };

  const importPhotoNotes = async (file?: File) => {
    if (!file) return;
    setInputMode("text");
    setState("idle");
    setError("");
    setOcrLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/ocr-notes", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Photo import failed");
      setTextInput((current) => [current.trim(), data.text].filter(Boolean).join("\n\n"));
      setDraftActionNotice("Imported rough notes from the photo. Review the text before generating.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo import failed. Type the key bullet points instead.");
    } finally {
      setOcrLoading(false);
    }
  };

  const saveNote = async () => {
    if (!generated || !selectedParticipant) {
      setError("Please select a participant before saving.");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile } = await supabase.from("users").select("full_name, organisation_id, role").eq("id", user.id).single();
    const { error: saveError } = await supabase.from("progress_notes").insert({
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
    if (saveError) {
      setSaving(false);
      setError(saveError.message);
      return;
    }
    setSaving(false); setSaved(true);
    setTimeout(() => { setSaved(false); setState("idle"); setGenerated(null); setTextInput(""); setTranscript(""); setDebriefAnswers({}); }, 2000);
    loadNotes();
  };

  const applyDraftAction = (action: "shorter" | "detail" | "professional" | "shiftcare") => {
    if (!generated?.noteText) return;
    const nextText = action === "shorter"
      ? makeDraftShorter(generated.noteText)
      : action === "detail"
        ? addMissingDetailsChecklist(generated.noteText)
        : action === "professional"
          ? makeDraftMoreProfessional(generated.noteText)
          : makeDraftShiftCareReady(generated.noteText);

    setGenerated({ ...generated, noteText: nextText });
    setCopiedGenerated(false);
    setDraftActionNotice(action === "shorter"
      ? "Shortened the draft. Review it before saving."
      : action === "detail"
        ? "Added a missing-details checklist without inventing information."
        : action === "professional"
          ? "Polished wording to be more factual and support-worker friendly."
          : "Cleaned spacing and formatting so it is easier to paste into ShiftCare.");
  };

  const copyGeneratedNote = async () => {
    if (!generated?.noteText) return;
    try {
      await copyTextWithFallback(generated.noteText);
      setCopiedGenerated(true);
    } catch {
      setError("Copy did not complete in this browser. Select the note text manually, then copy it into your workplace platform.");
    }
  };

  const approveNote = async (noteId: string) => {
    const res = await fetch("/api/notes/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId, action: "approve" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not approve note.");
      return;
    }
    loadNotes();
  };

  const participantFilter = searchParams.get("participant");
  const filteredNotes = notes.filter((n) => {
    const matchesStatus = filterStatus === "all" || n.status === filterStatus;
    const matchesParticipant = !participantFilter || n.participant_id === participantFilter;
    return matchesStatus && matchesParticipant;
  });
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (accountMode === "loading") {
    return <div className="p-6 flex items-center justify-center h-64"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }

  if (accountMode === "solo") {
    return <SoloNotesExperience />;
  }

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

            <div className="mb-4">
              <GoalLinkPanel goals={selectedParticipantData?.goals ?? []} compact />
            </div>

            <div className="mb-5">
              <AdaptiveDebriefPanel
                questions={debriefQuestions}
                answers={debriefAnswers}
                onAnswer={(id, value) => setDebriefAnswers((current) => ({ ...current, [id]: value }))}
              />
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
                  <button
                    onClick={startRecording}
                    disabled={!selectedParticipant}
                    aria-label="Start voice recording"
                    className="w-20 h-20 rounded-full bg-aria-600 hover:bg-aria-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center mx-auto shadow-teal transition-all hover:scale-105 active:scale-95"
                  >
                    <Mic className="w-8 h-8 text-white" />
                  </button>
                )}
                {state === "recording" && (
                  <div className="space-y-4">
                    <button onClick={stopRecording} aria-label="Stop voice recording" className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center mx-auto recording-pulse transition-all">
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
                <label className="btn-secondary w-full justify-center text-xs cursor-pointer">
                  {ocrLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Reading photo...</> : <><FileText className="w-4 h-4" /> Import photo of rough notes</>}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={ocrLoading}
                    onChange={(event) => {
                      void importPhotoNotes(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
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
              <div className="mt-3 space-y-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    setInputMode("text");
                    setState("idle");
                  }}
                  className="font-bold text-red-700 underline-offset-2 hover:underline"
                >
                  Switch to text mode
                </button>
              </div>
            )}

            {upgradePrompt && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                <p className="text-xs font-semibold text-amber-900">{upgradePrompt.message}</p>
                <Link href={upgradePrompt.href} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-900">
                  {upgradePrompt.label} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Generated note preview */}
          {generated && state === "done" && (
            <div className="card p-6 border-aria-200 bg-aria-50/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 text-sm">Generated Note</h3>
                <div className="flex gap-2">
                  <span className="badge-green text-[10px]">Review-ready</span>
                  {generated.incidentFlagged && <span className="badge-red text-[10px]">⚠ Incident</span>}
                </div>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap mb-4">{generated.noteText}</p>
              <QualityPanel text={generated.noteText} />
              <div className="mb-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
                <GoalLinkPanel goals={selectedParticipantData?.goals ?? []} noteText={generated.noteText} />
                <DignityRiskGuardian text={generated.noteText} />
              </div>
              <div className="mb-4">
                <UniversalPlatformBridge
                  text={generated.noteText}
                  noteType="progress"
                  onCopied={() => setCopiedGenerated(true)}
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 mb-4">
                <p className="text-xs font-bold text-slate-600 mb-2">Quick polish actions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button onClick={() => applyDraftAction("shorter")} className="btn-secondary justify-center text-xs">Make shorter</button>
                  <button onClick={() => applyDraftAction("detail")} className="btn-secondary justify-center text-xs">More detail</button>
                  <button onClick={() => applyDraftAction("professional")} className="btn-secondary justify-center text-xs">Make more professional</button>
                  <button onClick={() => applyDraftAction("shiftcare")} className="btn-secondary justify-center text-xs">Make easier to paste into ShiftCare</button>
                </div>
                {draftActionNotice && <p className="mt-2 text-xs font-medium text-slate-600">{draftActionNotice}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <div><span className="text-slate-500">Support level: </span><span className="font-medium capitalize">{generated.supportLevel}</span></div>
                <div><span className="text-slate-500">Mood: </span><span className="font-medium capitalize">{generated.mood}</span></div>
              </div>
              <p className="text-xs text-slate-500 mb-3">Draft only — please review and edit before submitting to your workplace system.</p>
              {copiedGenerated && (
                <div className="mb-3 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800">
                  Copied — paste this into your workplace platform.
                </div>
              )}
              <button onClick={copyGeneratedNote} className="btn-secondary w-full justify-center mb-2">
                <Copy className="w-4 h-4" /> Copy note
              </button>
              <button onClick={saveNote} disabled={saving || saved} className="btn-primary w-full justify-center">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save & File Note"}
              </button>
              <button onClick={() => { setGenerated(null); setState("idle"); setTranscript(""); setDebriefAnswers({}); }} className="btn-secondary w-full justify-center mt-2">
                <RotateCcw className="w-4 h-4" /> Start another draft
              </button>
            </div>
          )}
        </div>

        {/* Notes list */}
        <div className="lg:col-span-3">
          <div className="mb-4">
            <EvidencePackPanel notes={notes} />
          </div>

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
                      {note.status === "pending" && ["owner", "coordinator"].includes(viewerRole) && (
                        <button onClick={() => approveNote(note.id)} className="btn-primary text-xs py-1.5 px-4">
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          try {
                            await copyTextWithFallback(note.note_text);
                          } catch {
                            setError("Copy did not complete in this browser. Select the note text manually, then copy it.");
                          }
                        }}
                        className="btn-secondary text-xs py-1.5 px-4"
                      >
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

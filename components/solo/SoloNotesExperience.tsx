"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  FileText,
  Heart,
  Loader2,
  Mic,
  PenLine,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
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
type NoteType = "progress" | "incident" | "handover" | "risk" | "support_summary" | "participant_friendly" | "dot_point" | "coordinator_summary" | "daily_snapshot";
type DetailLevel = "concise" | "balanced" | "detailed";
type InputMode = "voice" | "text" | "multi";
type FormattingMode = "structured" | "short" | "detailed" | "handover_only" | "incident_summary" | "plain" | "paragraph" | "bullets";
type SoloView = "worker" | "participant" | "handover" | "transcript";

interface SignoffData {
  status?: string;
  participantComment?: string;
  participantName?: string;
  staffName?: string;
  confirmed?: boolean;
  linkedRoles?: string[];
  signedAt?: string;
  savedAt?: string;
}

interface MonthlySummary {
  summaryText: string;
  noteCount: number;
  reviewReminder: string;
}

interface SoloNote {
  id: string;
  note_type: string;
  input_method: string;
  context: Record<string, unknown> | null;
  draft_text: string;
  short_text: string | null;
  handover_text: string | null;
  incident_text: string | null;
  participant_text: string | null;
  raw_input: string | null;
  signoff: SignoffData | null;
  detail_level: string;
  formatting_mode: string;
  status: string;
  copied_at: string | null;
  submitted_at: string | null;
  created_at: string;
}

interface SoloState {
  plan: string;
  country: string;
  platform: string | null;
  usage: { used: number; limit: number; remaining: number };
  notes: SoloNote[];
}

const NOTE_TYPES: Array<{ key: NoteType; label: string; free?: boolean }> = [
  { key: "progress", label: "Progress note", free: true },
  { key: "dot_point", label: "Dot-point note" },
  { key: "handover", label: "Handover" },
  { key: "incident", label: "Incident note" },
  { key: "risk", label: "Risk concern" },
  { key: "participant_friendly", label: "Participant-friendly" },
  { key: "coordinator_summary", label: "Coordinator summary" },
  { key: "daily_snapshot", label: "Daily snapshot" },
  { key: "support_summary", label: "Support summary" },
];

const FORMAT_LABELS: Record<FormattingMode, string> = {
  structured: "Structured headings",
  short: "Short version",
  detailed: "Detailed version",
  handover_only: "Handover-only summary",
  incident_summary: "Incident summary",
  plain: "Plain text",
  paragraph: "Short paragraph",
  bullets: "Bullet summary",
};

const OPTIONAL_DETAILS_CHECKLIST = [
  "Shift time",
  "Participant mood on arrival",
  "Any follow-up for next worker",
  "Whether family/admin were notified",
  "Any changes in risk, health, behaviour, or routine",
];

const LOCAL_DRAFT_KEY = "aria-care-solo-local-draft-v2";

const DEFAULT_CONTEXT = {
  participant: "",
  shiftTime: "",
  supportProvided: "",
  goals: "",
  mood: "",
  risks: "",
  followUp: "",
};

const PLATFORM_OPTIONS = [
  { key: "shiftcare", label: "ShiftCare" },
  { key: "lumary", label: "Lumary" },
  { key: "brevity", label: "Brevity" },
  { key: "caremaster", label: "CareMaster" },
  { key: "plain", label: "Plain text / other" },
];

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

function formatTimer(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function planName(plan: string) {
  if (plan === "solo_pro") return "Solo Pro";
  if (plan === "solo") return "Solo";
  return "Free Solo";
}

function makeDraftShorter(text: string, fallback?: string | null) {
  if (fallback?.trim()) return fallback.trim();
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

function friendlyError(error: unknown, fallback = "Aria could not finish that draft. Your input is still saved here, so you can retry or switch to Type bullet points.") {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/failed to fetch|network|load failed|connection|timeout/i.test(message)) {
    return "Connection dropped before Aria could finish. Your typed notes are still saved in this browser. Please retry when reception improves.";
  }
  if (/api key|openai|anthropic|json|string did not match|unexpected token|internal server/i.test(message)) {
    return fallback;
  }
  return message || fallback;
}

function splitMultiClientDay(input: string) {
  const cleaned = input.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const lineParts = input
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 8);

  const parts = lineParts.length > 1
    ? lineParts
    : cleaned
      .split(/\s*(?:[.;]\s+)(?=[A-Z][A-Za-z'-]{1,30}\b)/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 8);

  return parts.slice(0, 8).map((text, index) => {
    const participant = text.match(/^([A-Z][A-Za-z'-]{1,30})\b/)?.[1] ?? `Participant ${index + 1}`;
    return { participant, text };
  });
}

function QualityPanel({ text, noteType }: { text: string; noteType: string }) {
  const quality = scoreNoteQuality(text, noteType);
  const signals = detectCareSignals(text);
  const scoreColor = quality.score >= 90 ? "text-emerald-600" : quality.score >= 75 ? "text-aria-600" : quality.score >= 55 ? "text-amber-600" : "text-red-600";

  return (
    <div className="mt-4 grid grid-cols-1 xl:grid-cols-5 gap-3">
      <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Review Check</p>
            <p className="text-sm font-semibold text-slate-700">{quality.label} · human review still required</p>
          </div>
          <p className={`font-display text-4xl font-bold ${scoreColor}`}>{quality.score}</p>
        </div>
        <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-aria-gradient transition-all duration-500" style={{ width: `${quality.score}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-1.5">
          {quality.checks.slice(0, 3).map((check) => (
            <div key={check.label} className="flex items-center gap-2 text-xs text-slate-600">
              <span className={`h-2 w-2 rounded-full ${check.passed ? "bg-emerald-500" : "bg-amber-500"}`} />
              {check.label}
            </div>
          ))}
        </div>
      </div>
      <div className="xl:col-span-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Care signals</p>
        {signals.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No risk or handover signals detected yet. Add context if something needs the next worker&apos;s attention.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {signals.map((signal) => (
              <div key={signal.label} className="rounded-xl border border-white bg-white px-3 py-2">
                <p className={`text-xs font-bold ${signal.level === "risk" ? "text-red-600" : signal.level === "watch" ? "text-amber-700" : "text-aria-700"}`}>{signal.label}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{signal.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const SIGNOFF_STATUS_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "confirmed", label: "Participant/carer confirmed the shift occurred" },
  { key: "declined", label: "Participant/carer declined to comment" },
  { key: "not_applicable", label: "Not applicable" },
];

const LINK_ROLE_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "support_coordinator", label: "Support coordinator" },
  { key: "team_leader", label: "Team leader" },
  { key: "provider_admin", label: "Provider / admin" },
  { key: "next_worker", label: "Next support worker" },
  { key: "behaviour_practitioner", label: "Behaviour practitioner" },
  { key: "family_carer", label: "Family / carer" },
];

function useReadAloud() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => () => {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  const speak = (id: string, text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) return;
    window.speechSynthesis.cancel();
    if (speakingId === id) {
      setSpeakingId(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.lang = "en-AU";
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  return { speakingId, speak };
}

function ReadAloudButton({ id, text, speakingId, onToggle }: { id: string; text: string; speakingId: string | null; onToggle: (id: string, text: string) => void }) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text?.trim()) return null;
  const active = speakingId === id;
  return (
    <button
      type="button"
      onClick={() => onToggle(id, text)}
      className="btn-secondary justify-center text-xs"
      aria-label={active ? "Stop reading aloud" : "Read this summary aloud"}
    >
      {active ? <><VolumeX className="w-4 h-4" /> Stop reading</> : <><Volume2 className="w-4 h-4" /> Read aloud</>}
    </button>
  );
}

export default function SoloNotesExperience() {
  const searchParams = useSearchParams();
  const [soloState, setSoloState] = useState<SoloState | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<RecordingState>("idle");
  const [inputMode, setInputMode] = useState<InputMode>("voice");
  const [noteType, setNoteType] = useState<NoteType>("progress");
  const [detailLevel, setDetailLevel] = useState<DetailLevel>("balanced");
  const [formattingMode, setFormattingMode] = useState<FormattingMode>("structured");
  const [selectedPlatform, setSelectedPlatform] = useState("shiftcare");
  const [textInput, setTextInput] = useState("");
  const [transcript, setTranscript] = useState("");
  const [currentNote, setCurrentNote] = useState<SoloNote | null>(null);
  const [editableDraft, setEditableDraft] = useState("");
  const [copiedLabel, setCopiedLabel] = useState("");
  const [error, setError] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [context, setContext] = useState(DEFAULT_CONTEXT);
  const [feedbackNoteId, setFeedbackNoteId] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [draftActionNotice, setDraftActionNotice] = useState("");
  const [debriefAnswers, setDebriefAnswers] = useState<Record<string, string>>({});
  const [ocrLoading, setOcrLoading] = useState(false);
  const [supportLog, setSupportLog] = useState(false);
  const [activeView, setActiveView] = useState<SoloView>("worker");
  const [participantDraft, setParticipantDraft] = useState("");
  const [signoff, setSignoff] = useState<SignoffData>({});
  const [signoffSaving, setSignoffSaving] = useState(false);
  const [signoffSaved, setSignoffSaved] = useState(false);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [monthlyMonth, setMonthlyMonth] = useState("");
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState("");
  const { speakingId, speak } = useReadAloud();

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadState = async () => {
    const res = await fetch("/api/solo/notes");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not load Solo notes");
    setSoloState(data);
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          textInput?: string;
          inputMode?: InputMode;
          noteType?: NoteType;
          detailLevel?: DetailLevel;
          formattingMode?: FormattingMode;
          selectedPlatform?: string;
          context?: typeof DEFAULT_CONTEXT;
          debriefAnswers?: Record<string, string>;
          supportLog?: boolean;
        };
        if (typeof saved.supportLog === "boolean") setSupportLog(saved.supportLog);
        if (saved.textInput) setTextInput(saved.textInput);
        if (saved.inputMode && ["voice", "text", "multi"].includes(saved.inputMode)) setInputMode(saved.inputMode);
        if (saved.noteType && NOTE_TYPES.some((type) => type.key === saved.noteType)) setNoteType(saved.noteType);
        if (saved.detailLevel) setDetailLevel(saved.detailLevel);
        if (saved.formattingMode) setFormattingMode(saved.formattingMode);
        if (saved.selectedPlatform) setSelectedPlatform(saved.selectedPlatform);
        if (saved.context) setContext({ ...DEFAULT_CONTEXT, ...saved.context });
        if (saved.debriefAnswers) setDebriefAnswers(saved.debriefAnswers);
      }
    } catch {
      window.localStorage.removeItem(LOCAL_DRAFT_KEY);
    }

    (async () => {
      try {
        await loadState();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load Solo workspace");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorder.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("mode") === "text") setInputMode("text");
  }, [searchParams]);

  useEffect(() => {
    const platform = soloState?.platform?.toLowerCase();
    if (!platform) return;
    const matched = PLATFORM_OPTIONS.find((option) => platform.includes(option.key) || platform.includes(option.label.toLowerCase()));
    if (matched) setSelectedPlatform(matched.key);
  }, [soloState?.platform]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify({
        textInput,
        inputMode,
        noteType,
        detailLevel,
        formattingMode,
        selectedPlatform,
        context,
        debriefAnswers,
        supportLog,
      }));
    } catch {
      // Local autosave is best-effort only.
    }
  }, [context, debriefAnswers, detailLevel, formattingMode, inputMode, noteType, selectedPlatform, supportLog, textInput]);

  // Hydrate participant-friendly draft + sign-off whenever a different note opens.
  useEffect(() => {
    if (!currentNote) return;
    setParticipantDraft(currentNote.participant_text ?? "");
    setSignoff(currentNote.signoff ?? {});
    setActiveView("worker");
    setSignoffSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNote?.id]);

  const atLimit = !!soloState && soloState.usage.remaining <= 0;
  const oneLeft = !!soloState && soloState.plan === "solo_free" && soloState.usage.remaining === 1;
  const freeTypeBlocked = soloState?.plan === "solo_free" && noteType !== "progress";
  const debriefInput = inputMode === "voice" ? transcript || textInput : textInput || transcript;
  const multiClientSegments = inputMode === "multi" ? splitMultiClientDay(textInput) : [];
  const debriefQuestions = buildAdaptiveDebriefQuestions(
    debriefInput,
    { ...context, debriefAnswers, platform: selectedPlatform || soloState?.platform || "" },
    noteType
  );
  const currentNoteContext = currentNote?.context && typeof currentNote.context === "object" ? currentNote.context : {};
  const currentNoteGoals = typeof currentNoteContext.goals === "string" ? currentNoteContext.goals : context.goals;

  const availableViews = ([
    { key: "worker", label: "Worker note", show: true },
    { key: "participant", label: "Participant-friendly", show: !!currentNote?.participant_text },
    { key: "handover", label: "Handover summary", show: !!currentNote?.handover_text },
    { key: "transcript", label: "Transcript", show: !!currentNote?.raw_input },
  ] as Array<{ key: SoloView; label: string; show: boolean }>).filter((view) => view.show);

  const startRecording = async () => {
    try {
      setError("");
      setCopiedLabel("");
      if (atLimit) {
        setError("You've used your free notes this month. Upgrade to keep creating structured notes, or come back next month.");
        return;
      }
      if (freeTypeBlocked) {
        setError("Free Solo includes basic progress notes. Upgrade to create this note type.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Your browser does not support in-browser recording. Use text mode for this note.");
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
      timerRef.current = setInterval(() => setRecordingTime((value) => value + 1), 1000);
    } catch (e) {
      const message = friendlyError(e, "Microphone access did not work in this browser.");
      setError(`${message} You can still use Type bullet points for this note.`);
      setState("error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setState("processing");
  };

  const handleAudioStop = async () => {
    const mimeType = mediaRecorder.current?.mimeType || "audio/webm";
    if (audioChunks.current.length === 0) {
      setError("No audio was captured. Check the microphone, move closer, or switch to Type bullet points for a reliable fallback.");
      setState("error");
      return;
    }

    try {
      const audioBlob = new Blob(audioChunks.current, { type: mimeType });
      const formData = new FormData();
      formData.append("audio", audioBlob, `recording.${audioExtensionFromMimeType(mimeType)}`);
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Transcription failed");
      setTranscript(data.transcript);
      await generateNote(data.transcript, "voice");
    } catch (e) {
      const message = friendlyError(e, "Voice generation needs internet and could not finish.");
      setError(`${message} Please use Type bullet points if the microphone or transcription service is unavailable.`);
      setState("error");
    }
  };

  const generateNote = async (input: string, method: InputMode = inputMode) => {
    if (!input.trim()) return;
    setState("processing");
    setError("");
    setCopiedLabel("");
    try {
      const res = await fetch("/api/solo/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          noteType,
          detailLevel,
          formattingMode,
          inputMethod: method,
          supportLog,
          context: { ...context, debriefAnswers, platform: selectedPlatform || soloState?.platform || "" },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not generate note");
      setCurrentNote(data.note);
      setEditableDraft(data.note.draft_text);
      setDraftActionNotice("");
      setSoloState((current) => current ? {
        ...current,
        usage: data.usage,
        notes: [data.note, ...current.notes.filter((note) => note.id !== data.note.id)],
      } : current);
      setState("done");
    } catch (e) {
      setError(friendlyError(e));
      setState("error");
    }
  };

  const generateMultiClientNotes = async () => {
    const segments = splitMultiClientDay(textInput);
    if (segments.length === 0) {
      setError("Paste a rough day dump first. Example: John 9-11 groceries no issues. Sarah 12-2 anxious at shops, used breathing.");
      return;
    }
    if (soloState && segments.length > soloState.usage.remaining) {
      setError(`Detected ${segments.length} separate notes, but you only have ${soloState.usage.remaining} note${soloState.usage.remaining === 1 ? "" : "s"} left this month. Generate one at a time or upgrade before creating them all.`);
      return;
    }

    setState("processing");
    setError("");
    setCopiedLabel("");

    try {
      const created: SoloNote[] = [];
      let latestUsage = soloState?.usage;

      for (const segment of segments) {
        const res = await fetch("/api/solo/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: segment.text,
            noteType: "progress",
            detailLevel,
            formattingMode,
            inputMethod: "text",
            context: {
              ...context,
              participant: context.participant || segment.participant,
              debriefAnswers,
              platform: selectedPlatform || soloState?.platform || "",
              multiClientDay: true,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not generate one of the notes");
        created.push(data.note);
        latestUsage = data.usage;
      }

      if (created.length > 0) {
        setCurrentNote(created[0]);
        setEditableDraft(created[0].draft_text);
        setDraftActionNotice(`Created ${created.length} separate draft note${created.length === 1 ? "" : "s"}. Use Recent notes to open each one before copying.`);
        setSoloState((current) => current ? {
          ...current,
          usage: latestUsage ?? current.usage,
          notes: [...created, ...current.notes.filter((note) => !created.some((newNote) => newNote.id === note.id))],
        } : current);
      }
      setState("done");
    } catch (e) {
      setError(friendlyError(e, "Aria could not finish the multi-client batch. Any notes created before the error are saved in Recent notes, and your original input is still here."));
      setState("error");
      await loadState().catch(() => undefined);
    }
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
      setError(friendlyError(e, "Photo import could not finish. Type the key bullet points instead."));
    } finally {
      setOcrLoading(false);
    }
  };

  const copyText = async (label: string, text?: string | null) => {
    if (!text) return;
    try {
      await copyTextWithFallback(text);
      setCopiedLabel(label);
      if (currentNote) {
        await fetch("/api/solo/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteId: currentNote.id, action: "copied" }),
        });
      }
    } catch {
      setError("Copy did not complete in this browser. Select the draft text manually, then copy it into your workplace platform.");
    }
  };

  const applyDraftAction = (action: "shorter" | "detail" | "professional" | "shiftcare") => {
    if (!editableDraft.trim()) return;

    if (action === "shorter") {
      setEditableDraft(makeDraftShorter(editableDraft, currentNote?.short_text));
      setDraftActionNotice("Shortened the draft. Review it before copying.");
      return;
    }

    if (action === "detail") {
      setEditableDraft(addMissingDetailsChecklist(editableDraft));
      setDraftActionNotice("Added a missing-details checklist without inventing information.");
      return;
    }

    if (action === "professional") {
      setEditableDraft(makeDraftMoreProfessional(editableDraft));
      setDraftActionNotice("Polished wording to be more factual and support-worker friendly.");
      return;
    }

    setEditableDraft(makeDraftShiftCareReady(editableDraft));
    setDraftActionNotice("Cleaned spacing and formatting so it is easier to paste into ShiftCare.");
  };

  const saveEditedDraft = async () => {
    if (!currentNote) return;
    setSavingEdit(true);
    const res = await fetch("/api/solo/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId: currentNote.id, draftText: editableDraft }),
    });
    if (res.ok) {
      const updated = { ...currentNote, draft_text: editableDraft };
      setCurrentNote(updated);
      setSoloState((current) => current ? {
        ...current,
        notes: current.notes.map((note) => note.id === updated.id ? updated : note),
      } : current);
    }
    setSavingEdit(false);
  };

  const markSubmitted = async () => {
    if (!currentNote) return;
    await fetch("/api/solo/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId: currentNote.id, action: "submitted" }),
    });
    await loadState();
  };

  const toggleLinkedRole = (role: string) => {
    setSignoff((s) => {
      const current = Array.isArray(s.linkedRoles) ? s.linkedRoles : [];
      const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
      return { ...s, linkedRoles: next };
    });
    setSignoffSaved(false);
  };

  const generateMonthlySummary = async () => {
    setMonthlyLoading(true);
    setMonthlyError("");
    try {
      const res = await fetch("/api/solo/monthly-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthOffset: 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not generate the monthly summary");
      setMonthlySummary(data.summary);
      setMonthlyMonth(data.month ?? "");
    } catch (e) {
      setMonthlyError(friendlyError(e, "Could not generate the monthly summary. Please retry."));
    } finally {
      setMonthlyLoading(false);
    }
  };

  const saveSupportLog = async () => {
    if (!currentNote) return;
    setSignoffSaving(true);
    setSignoffSaved(false);
    try {
      const res = await fetch("/api/solo/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: currentNote.id,
          participantText: participantDraft,
          signoff: { ...signoff, signedAt: signoff.signedAt || new Date().toISOString() },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the support log");
      const savedSignoff: SignoffData = data.note?.signoff ?? signoff;
      const updated = { ...currentNote, participant_text: participantDraft, signoff: savedSignoff };
      setCurrentNote(updated);
      setSignoff(savedSignoff);
      setSoloState((current) => current ? {
        ...current,
        notes: current.notes.map((note) => note.id === updated.id ? updated : note),
      } : current);
      setSignoffSaved(true);
    } catch (e) {
      setError(friendlyError(e, "Could not save the support log. Please retry."));
    } finally {
      setSignoffSaving(false);
    }
  };

  const sendFeedback = async (rating: "yes" | "sort_of" | "no", noteId = currentNote?.id) => {
    if (!noteId) return;
    const res = await fetch("/api/solo/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId, rating, comment: feedbackText }),
    });
    if (res.ok) {
      setFeedbackNoteId(noteId);
      setFeedbackText("");
    }
  };

  const resetComposer = () => {
    setState("idle");
    setCurrentNote(null);
    setEditableDraft("");
    setTextInput("");
    setTranscript("");
    setCopiedLabel("");
    setDraftActionNotice("");
    setError("");
    setDebriefAnswers({});
    window.localStorage.removeItem(LOCAL_DRAFT_KEY);
  };

  if (loading) {
    return <div className="p-6 flex items-center justify-center h-64"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }

  if (!soloState) {
    return <div className="p-6"><div className="card p-6 text-sm text-red-600">{error || "Solo workspace could not load."}</div></div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div className="rounded-3xl bg-slate-950 text-white p-5 sm:p-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.24),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(8,145,178,0.2),transparent_35%)]" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs font-semibold text-teal-100">
              <Sparkles className="w-3.5 h-3.5" /> Aria Care Solo
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mt-4">Create in Aria. Copy into ShiftCare.</h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-2xl">
              Turn after-shift voice notes or rough bullet points into clean drafts you can review and paste into ShiftCare, Lumary, Brevity, CareMaster, or whatever your provider uses.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/10 p-4 min-w-48">
            <p className="text-xs uppercase tracking-wide text-slate-400">Usage this month</p>
            <p className="font-display text-3xl font-bold mt-1">{soloState.usage.used}/{soloState.usage.limit}</p>
            <p className="text-xs text-teal-100">{planName(soloState.plan)} · {soloState.usage.remaining} left</p>
          </div>
        </div>
      </div>

      {oneLeft && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm font-medium text-amber-900">You&apos;ve got 1 free note left this month. Upgrade when you&apos;re ready to keep creating notes.</p>
          <Link href="/billing?reason=solo-note-limit" className="text-xs font-bold text-amber-800 hover:underline">View Solo plans</Link>
        </div>
      )}

      {atLimit && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-950">You&apos;ve used your free notes this month.</p>
            <p className="text-sm text-amber-800 mt-1">Upgrade to keep creating structured notes, or come back next month. Your saved notes stay available.</p>
            <Link href="/billing?reason=solo-note-limit" className="btn-primary mt-3">Upgrade Solo <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">Create note</h2>
                <p className="text-xs text-slate-500">Fast enough for the car after a shift.</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-aria-600" />
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">What do you need?</label>
                <div className="grid grid-cols-2 gap-2">
                  {NOTE_TYPES.map((type) => (
                    <button
                      key={type.key}
                      onClick={() => {
                        setNoteType(type.key);
                        if (soloState.plan === "solo_free" && !type.free) {
                          setError("Free Solo includes basic progress notes. Upgrade when you need incident, handover, risk or support summary drafts.");
                        } else {
                          setError("");
                        }
                      }}
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all ${
                        noteType === type.key ? "border-aria-300 bg-aria-50 text-aria-800" : "border-slate-200 text-slate-600 hover:border-slate-300"
                      } ${soloState.plan === "solo_free" && !type.free ? "opacity-60" : ""}`}
                    >
                      {type.label}
                      {soloState.plan === "solo_free" && !type.free && <span className="block text-[10px] text-slate-400">Paid</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-aria-200 bg-aria-50/50 p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={supportLog}
                    onChange={(e) => setSupportLog(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-aria-600"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                      <Users className="w-4 h-4 text-aria-600" /> Support log (involve participant/carer)
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Adds a plain-language summary to read with the participant, plus an optional participant/carer comment and sign-off. Support log confirmation only — not legal proof or a compliance guarantee.
                    </span>
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">Workplace platform</label>
                  <select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)} className="input">
                    {PLATFORM_OPTIONS.map((platform) => (
                      <option key={platform.key} value={platform.key}>{platform.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Detail level</label>
                  <select value={detailLevel} onChange={(e) => setDetailLevel(e.target.value as DetailLevel)} className="input">
                    <option value="concise">Concise</option>
                    <option value="balanced">Balanced</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </div>
                <div>
                  <label className="label">Copy format</label>
                  <select value={formattingMode} onChange={(e) => setFormattingMode(e.target.value as FormattingMode)} className="input">
                    {Object.entries(FORMAT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-700 mb-2">Optional context</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input className="input" value={context.participant} onChange={(e) => setContext({ ...context, participant: e.target.value })} placeholder="Initials or nickname only" />
                  <input className="input" value={context.shiftTime} onChange={(e) => setContext({ ...context, shiftTime: e.target.value })} placeholder="Date/time of shift" />
                  <input className="input" value={context.supportProvided} onChange={(e) => setContext({ ...context, supportProvided: e.target.value })} placeholder="Support provided" />
                  <input className="input" value={context.mood} onChange={(e) => setContext({ ...context, mood: e.target.value })} placeholder="Mood/presentation" />
                  <input className="input" value={context.risks} onChange={(e) => setContext({ ...context, risks: e.target.value })} placeholder="Risks/incidents" />
                </div>
                <textarea
                  className="input mt-2 min-h-[76px] resize-y text-sm"
                  value={context.goals}
                  onChange={(e) => setContext({ ...context, goals: e.target.value })}
                  placeholder="Participant goals, one per line if known"
                />
                <input className="input mt-2" value={context.followUp} onChange={(e) => setContext({ ...context, followUp: e.target.value })} placeholder="Follow-up or handover notes" />
                <p className="text-[11px] text-slate-500 mt-2">Avoid unnecessary personal details. Initials or nicknames are best for Solo notes.</p>
              </div>

              <GoalLinkPanel goals={context.goals} compact />

              <AdaptiveDebriefPanel
                questions={debriefQuestions}
                answers={debriefAnswers}
                onAnswer={(id, value) => setDebriefAnswers((current) => ({ ...current, [id]: value }))}
              />

              <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-50">
                {(["voice", "text", "multi"] as const).map((mode) => (
                  <button key={mode} onClick={() => setInputMode(mode)} className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${inputMode === mode ? "bg-white text-slate-900 shadow-card" : "text-slate-500"}`}>
                    {mode === "voice" ? "Voice note" : mode === "text" ? "Type bullet points" : "Multi-client day"}
                  </button>
                ))}
              </div>

              {inputMode === "voice" ? (
                <div className="text-center py-6">
                  {state !== "recording" && state !== "processing" && (
                    <button
                      onClick={startRecording}
                      disabled={atLimit || freeTypeBlocked}
                      aria-label="Start voice recording"
                      className="w-24 h-24 rounded-full bg-aria-600 hover:bg-aria-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center mx-auto shadow-teal transition-all hover:scale-105 active:scale-95"
                    >
                      <Mic className="w-10 h-10 text-white" />
                    </button>
                  )}
                  {state === "recording" && (
                    <div className="space-y-4">
                      <button onClick={stopRecording} aria-label="Stop voice recording" className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center mx-auto recording-pulse transition-all">
                        <Square className="w-9 h-9 text-white fill-white" />
                      </button>
                      <p className="text-2xl font-mono font-bold text-slate-900">{formatTimer(recordingTime)}</p>
                      <p className="text-xs text-slate-500">Recording... tap to stop</p>
                    </div>
                  )}
                  {state === "processing" && (
                    <div className="space-y-3">
                      <Loader2 className="w-10 h-10 animate-spin text-aria-500 mx-auto" />
                      <p className="text-sm font-semibold text-slate-800">Aria is writing your copy-ready draft...</p>
                      <p className="text-xs text-slate-500">Review before pasting into your workplace platform.</p>
                    </div>
                  )}
                </div>
              ) : inputMode === "text" ? (
                <div className="space-y-3">
                  <p className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-[11px] leading-relaxed text-cyan-900">
                    Rural/offline capture: typed notes auto-save locally in this browser. Voice transcription and note generation need internet, but your typed input will stay here if generation fails.
                  </p>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    rows={8}
                    className="input resize-none text-sm leading-relaxed"
                    placeholder="Bullet points are perfect: supported J from 2 to 5, grocery shopping, calm presentation, prompted at checkout, no incidents, tired near end, next worker encourage hydration."
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
                    onClick={() => generateNote(textInput, "text")}
                    disabled={!textInput.trim() || state === "processing" || atLimit || freeTypeBlocked}
                    className="btn-primary w-full justify-center disabled:opacity-50"
                  >
                    {state === "processing" ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : "Generate copy-ready note"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-[11px] leading-relaxed text-cyan-900">
                    Multi-client day mode splits a rough end-of-day dump into separate draft notes. Each detected participant uses one note from your monthly allowance.
                  </p>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    rows={8}
                    className="input resize-none text-sm leading-relaxed"
                    placeholder="John 9-11 groceries no issues. Sarah 12-2 anxious at shops, used breathing strategy and settled. Macy 3-5 cooking activity, handover hydration."
                  />
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-700">Detected separate notes</p>
                    {multiClientSegments.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-500">Paste a rough day dump and Aria will show the detected participant sections here.</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {multiClientSegments.map((segment, index) => (
                          <div key={`${segment.participant}-${index}`} className="rounded-xl border border-white bg-white px-3 py-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900">{segment.participant}</p>
                                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{segment.text}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setInputMode("text");
                                  setTextInput(segment.text);
                                  setContext((current) => ({ ...current, participant: current.participant || segment.participant }));
                                }}
                                className="text-[11px] font-bold text-aria-700 hover:underline"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={generateMultiClientNotes}
                    disabled={multiClientSegments.length === 0 || state === "processing" || atLimit || freeTypeBlocked}
                    className="btn-primary w-full justify-center disabled:opacity-50"
                  >
                    {state === "processing" ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating separate drafts...</> : "Generate separate draft notes"}
                  </button>
                </div>
              )}

              {transcript && inputMode === "voice" && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">Transcript</p>
                  <p className="text-xs text-slate-600">{transcript}</p>
                </div>
              )}

              {error && (
                <div className="space-y-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode("text");
                      setState("idle");
                    }}
                    className="font-bold text-red-800 underline-offset-2 hover:underline"
                  >
                    Switch to Type bullet points
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {currentNote ? (
            <div className="card p-5 sm:p-6 border-aria-200">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-900">Copy-ready draft</h3>
                  <p className="text-xs text-slate-500">Aria creates drafts only. Always review and edit before submitting.</p>
                </div>
                <span className="badge-teal text-[10px] capitalize">{currentNote.note_type.replace("_", " ")}</span>
              </div>

              {availableViews.length > 1 && (
                <div className="flex flex-wrap gap-1 bg-slate-100 rounded-xl p-1 mb-4">
                  {availableViews.map((view) => (
                    <button
                      key={view.key}
                      onClick={() => setActiveView(view.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeView === view.key ? "bg-white text-slate-900 shadow-card" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
              )}

              {activeView === "worker" && (
              <div>
              {(currentNote.note_type === "incident" || currentNote.note_type === "risk") && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 mb-4 text-xs text-amber-900">
                  Follow your organisation&apos;s incident reporting and escalation process.
                </div>
              )}

              <textarea
                value={editableDraft}
                onChange={(e) => {
                  setEditableDraft(e.target.value);
                  setDraftActionNotice("");
                }}
                rows={14}
                className="input resize-y text-sm leading-relaxed whitespace-pre-wrap"
              />

              <QualityPanel text={editableDraft} noteType={currentNote.note_type} />

              <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
                <GoalLinkPanel goals={currentNoteGoals} noteText={editableDraft} />
                <DignityRiskGuardian text={editableDraft} />
              </div>

              <div className="mt-4">
                <UniversalPlatformBridge
                  text={editableDraft}
                  noteType={currentNote.note_type}
                  onCopied={(label) => {
                    setCopiedLabel(label);
                    if (currentNote) {
                      void fetch("/api/solo/notes", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ noteId: currentNote.id, action: "copied" }),
                      });
                    }
                  }}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-600 mb-2">Quick polish actions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button onClick={() => applyDraftAction("shorter")} className="btn-secondary justify-center text-xs">Make shorter</button>
                  <button onClick={() => applyDraftAction("detail")} className="btn-secondary justify-center text-xs">More detail</button>
                  <button onClick={() => applyDraftAction("professional")} className="btn-secondary justify-center text-xs">Make more professional</button>
                  <button onClick={() => applyDraftAction("shiftcare")} className="btn-secondary justify-center text-xs">Make easier to paste into ShiftCare</button>
                </div>
                {draftActionNotice && <p className="mt-2 text-xs font-medium text-slate-600">{draftActionNotice}</p>}
              </div>

              {copiedLabel && (
                <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800">
                  Copied — paste this into your workplace platform.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                <button onClick={() => copyText("full", editableDraft)} className="btn-primary justify-center"><Copy className="w-4 h-4" /> Copy full note</button>
                <button onClick={() => copyText("short", currentNote.short_text)} className="btn-secondary justify-center"><Copy className="w-4 h-4" /> Copy short version</button>
                <button onClick={() => copyText("handover", currentNote.handover_text)} disabled={!currentNote.handover_text} className="btn-secondary justify-center disabled:opacity-40"><Copy className="w-4 h-4" /> Copy handover summary</button>
                <button onClick={() => copyText("plain text", makeDraftShiftCareReady(editableDraft))} className="btn-secondary justify-center"><Copy className="w-4 h-4" /> Copy plain text</button>
                <button onClick={() => copyText("incident", currentNote.incident_text)} disabled={!currentNote.incident_text} className="btn-secondary justify-center disabled:opacity-40 sm:col-span-2"><Copy className="w-4 h-4" /> Copy incident summary</button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <button onClick={saveEditedDraft} disabled={savingEdit} className="btn-secondary justify-center">
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save edits
                </button>
                <button onClick={markSubmitted} className="btn-secondary justify-center"><Send className="w-4 h-4" /> Mark copied/submitted</button>
                <button onClick={() => generateNote(transcript || textInput, inputMode)} className="btn-secondary justify-center"><RotateCcw className="w-4 h-4" /> Regenerate</button>
                <button onClick={resetComposer} className="btn-secondary justify-center">New note</button>
              </div>

              <p className="mt-3 text-xs text-slate-500">Draft only — please review and edit before submitting to your workplace system.</p>
              </div>
              )}

              {activeView === "participant" && (
                <div>
                  <div className="rounded-xl border border-aria-100 bg-aria-50/60 px-3 py-2 mb-3 text-xs text-aria-900 flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 flex-shrink-0" /> Plain-language summary you can read with the participant or carer. Review it first — draft only.
                  </div>
                  <textarea
                    value={participantDraft}
                    onChange={(e) => setParticipantDraft(e.target.value)}
                    rows={10}
                    className="input resize-y text-sm leading-relaxed whitespace-pre-wrap"
                    placeholder="A plain-language summary appears here when support log is on, or generate a Participant-friendly note."
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                    <ReadAloudButton id={`participant-${currentNote.id}`} text={participantDraft} speakingId={speakingId} onToggle={speak} />
                    <button onClick={() => copyText("participant-friendly summary", participantDraft)} className="btn-secondary justify-center text-xs"><Copy className="w-4 h-4" /> Copy</button>
                    <button onClick={saveSupportLog} disabled={signoffSaving || !participantDraft.trim()} className="btn-secondary justify-center text-xs disabled:opacity-50">
                      {signoffSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">Check it is accurate and suitable to share before reading it with the participant.</p>
                </div>
              )}

              {activeView === "handover" && (
                <div>
                  <textarea value={currentNote.handover_text ?? ""} readOnly rows={8} className="input resize-y text-sm leading-relaxed whitespace-pre-wrap bg-slate-50" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    <ReadAloudButton id={`handover-${currentNote.id}`} text={currentNote.handover_text ?? ""} speakingId={speakingId} onToggle={speak} />
                    <button onClick={() => copyText("handover summary", currentNote.handover_text)} className="btn-secondary justify-center text-xs"><Copy className="w-4 h-4" /> Copy handover</button>
                  </div>
                </div>
              )}

              {activeView === "transcript" && (
                <div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 mb-3 text-[11px] text-slate-500">Direct record of what you entered for this shift, before Aria structured it.</div>
                  <textarea value={currentNote.raw_input ?? ""} readOnly rows={8} className="input resize-y text-sm leading-relaxed whitespace-pre-wrap bg-slate-50" />
                  <button onClick={() => copyText("transcript", currentNote.raw_input)} className="btn-secondary justify-center text-xs mt-3"><Copy className="w-4 h-4" /> Copy transcript</button>
                </div>
              )}

              {/* Support log & participant/carer sign-off */}
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-1">
                  <PenLine className="w-4 h-4 text-aria-600" />
                  <h4 className="font-display font-bold text-slate-900 text-sm">Support log &amp; participant sign-off</h4>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">Optional. Support log confirmation only — this is not legal proof, a witnessed signature, or a compliance guarantee.</p>

                <div className="space-y-3">
                  <div>
                    <label className="label">Participant/carer</label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {SIGNOFF_STATUS_OPTIONS.map((opt) => (
                        <label key={opt.key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="signoff-status"
                            checked={signoff.status === opt.key}
                            onChange={() => setSignoff((s) => ({ ...s, status: opt.key }))}
                            className="h-3.5 w-3.5 accent-aria-600"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label">Participant/carer comments</label>
                    <textarea
                      value={signoff.participantComment ?? ""}
                      onChange={(e) => setSignoff((s) => ({ ...s, participantComment: e.target.value }))}
                      rows={2}
                      className="input resize-y text-sm"
                      placeholder="Optional: anything the participant or carer wanted noted, in their words."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input className="input" value={signoff.participantName ?? ""} onChange={(e) => setSignoff((s) => ({ ...s, participantName: e.target.value }))} placeholder="Participant/carer name" />
                    <input className="input" value={signoff.staffName ?? ""} onChange={(e) => setSignoff((s) => ({ ...s, staffName: e.target.value }))} placeholder="Staff member name" />
                  </div>

                  <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={signoff.confirmed === true}
                      onChange={(e) => setSignoff((s) => ({ ...s, confirmed: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 accent-aria-600"
                    />
                    I confirm this support log was reviewed with the participant/carer where appropriate.
                  </label>

                  <div className="pt-1 border-t border-slate-100">
                    <label className="label flex items-center gap-1.5 mt-3"><Users className="w-3.5 h-3.5 text-aria-600" /> Who should be linked in?</label>
                    <p className="text-[11px] text-slate-500 mb-2">Flag who should see this note. A visible note for your team — not a messaging system.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {LINK_ROLE_OPTIONS.map((role) => {
                        const checked = (signoff.linkedRoles ?? []).includes(role.key);
                        return (
                          <label key={role.key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={checked} onChange={() => toggleLinkedRole(role.key)} className="h-3.5 w-3.5 accent-aria-600" />
                            {role.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <button onClick={saveSupportLog} disabled={signoffSaving} className="btn-primary justify-center text-xs">
                      {signoffSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : signoffSaved ? <><Check className="w-4 h-4" /> Saved</> : <><Check className="w-4 h-4" /> Save support log</>}
                    </button>
                    {signoff.savedAt && <span className="text-[11px] text-slate-400">Last saved {timeAgo(signoff.savedAt)}</span>}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-600 mb-2">Was this note useful?</p>
                {feedbackNoteId === currentNote.id ? (
                  <p className="text-xs text-emerald-700 font-semibold">Thanks — feedback saved.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => sendFeedback("yes")} className="btn-secondary text-xs py-1.5 px-3">Yes</button>
                      <button onClick={() => sendFeedback("sort_of")} className="btn-secondary text-xs py-1.5 px-3">Sort of</button>
                      <button onClick={() => sendFeedback("no")} className="btn-secondary text-xs py-1.5 px-3">No</button>
                    </div>
                    <input value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} className="input" placeholder="Optional: what would make it better?" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center border-dashed">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-display text-xl font-bold text-slate-900">Your draft will appear here</h3>
              <p className="text-sm text-slate-500 mt-1">Record voice or type bullets, then copy the reviewed result into your workplace platform.</p>
            </div>
          )}

          <EvidencePackPanel notes={soloState.notes} onCopied={(label) => setCopiedLabel(label)} />

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-slate-900">Recent notes</h3>
                <p className="text-xs text-slate-500">Private history visible only to your account.</p>
              </div>
            </div>
            {soloState.notes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No Solo notes yet.</div>
            ) : (
              <div className="space-y-2">
                {soloState.notes.slice(0, 8).map((note) => (
                  <button
                    key={note.id}
                    onClick={() => { setCurrentNote(note); setEditableDraft(note.draft_text); setState("done"); }}
                    className="w-full text-left rounded-2xl border border-slate-100 hover:border-aria-200 hover:bg-aria-50/30 px-4 py-3 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 capitalize">{note.note_type.replace("_", " ")}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{note.draft_text.slice(0, 120)}</p>
                      </div>
                      <span className="text-[11px] text-slate-400 flex-shrink-0">{timeAgo(note.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Monthly support summary */}
          <div className="card p-5">
            <h3 className="font-display font-bold text-slate-900 flex items-center gap-1.5"><FileText className="w-4 h-4 text-aria-600" /> Monthly support summary</h3>
            <p className="text-xs text-slate-500 mb-3">Pulls this month&apos;s notes into one end-of-month summary you can review and share.</p>
            <button onClick={generateMonthlySummary} disabled={monthlyLoading} className="btn-secondary w-full justify-center text-xs">
              {monthlyLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Summarising your month...</> : <><Sparkles className="w-4 h-4" /> Generate this month&apos;s summary</>}
            </button>
            {monthlyError && <p className="mt-2 text-xs text-red-600">{monthlyError}</p>}
            {monthlySummary && (
              <div className="mt-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">{monthlyMonth} · {monthlySummary.noteCount} note{monthlySummary.noteCount === 1 ? "" : "s"}</p>
                <textarea readOnly value={monthlySummary.summaryText} rows={10} className="input resize-y text-sm leading-relaxed whitespace-pre-wrap bg-slate-50" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <ReadAloudButton id="monthly-summary" text={monthlySummary.summaryText} speakingId={speakingId} onToggle={speak} />
                  <button onClick={() => copyText("monthly summary", monthlySummary.summaryText)} className="btn-secondary justify-center text-xs"><Copy className="w-4 h-4" /> Copy summary</button>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">{monthlySummary.reviewReminder}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

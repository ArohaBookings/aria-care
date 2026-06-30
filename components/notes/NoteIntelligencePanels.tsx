"use client";

import { useState } from "react";
import {
  Brain,
  CheckCircle2,
  ClipboardCopy,
  FileSearch,
  Link2,
  MessageCircleQuestion,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  PLATFORM_FORMATS,
  buildDignityGuardianSuggestions,
  buildEvidencePack,
  buildGoalCards,
  buildPlatformDraft,
  linkGoalsToNote,
  type DebriefQuestion,
  type PlatformFormat,
} from "@/lib/notes/intelligence";

type EvidenceNote = {
  note_type?: string | null;
  draft_text?: string | null;
  note_text?: string | null;
  created_at?: string | null;
};

export async function copyTextWithFallback(text: string) {
  if (!text.trim()) return;

  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall through to the textarea copy fallback below.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const copied = document.execCommand("copy");
    if (!copied) throw new Error("Copy command failed");
  } finally {
    document.body.removeChild(textarea);
  }
}

export function GoalLinkPanel({
  goals,
  noteText = "",
  compact = false,
}: {
  goals?: string | string[] | null;
  noteText?: string;
  compact?: boolean;
}) {
  const cards = buildGoalCards(goals);
  const links = noteText ? linkGoalsToNote(noteText, goals) : [];

  return (
    <div className={`rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-950 text-cyan-100">
          <Link2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">GoalLink Copilot</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            Connect daily support to goals without making things up.
          </p>
          {cards.length === 0 ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Add participant goals once. Aria will turn them into plain-language goal cards and look for safe evidence when the note is created.
            </p>
          ) : links.length > 0 ? (
            <div className="mt-3 space-y-2">
              {links.slice(0, 3).map((goal) => (
                <div key={goal.id} className="rounded-xl border border-cyan-100 bg-white/80 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-bold text-slate-900">{goal.title}</p>
                    <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-800">
                      {goal.confidence}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{goal.evidence}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 grid gap-2">
              {cards.slice(0, compact ? 2 : 3).map((goal) => (
                <div key={goal.id} className="rounded-xl border border-cyan-100 bg-white/80 px-3 py-2">
                  <p className="text-xs font-bold text-slate-900">{goal.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{goal.evidencePrompt}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdaptiveDebriefPanel({
  questions,
  answers,
  onAnswer,
}: {
  questions: DebriefQuestion[];
  answers: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200">
          <MessageCircleQuestion className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-200">Adaptive Shift Debrief</p>
          <p className="mt-1 text-sm font-semibold text-white">
            Aria asks only what is missing, not another long form.
          </p>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
          Debrief looks complete. You can generate now or add more context if needed.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {questions.map((question) => (
            <label key={question.id} className="block">
              <span className="text-xs font-semibold text-white">{question.question}</span>
              <span className="mt-0.5 block text-[11px] text-slate-400">{question.why}</span>
              <input
                value={answers[question.id] ?? ""}
                onChange={(event) => onAnswer(question.id, event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-teal-300"
                placeholder={question.placeholder}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function DignityRiskGuardian({ text }: { text: string }) {
  const suggestions = buildDignityGuardianSuggestions(text);

  return (
    <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-950 text-amber-100">
          <ShieldAlert className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Dignity + Risk Guardian</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            Flags vague, judgemental, risky, or overconfident wording.
          </p>
          {suggestions.length === 0 ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              No obvious dignity or risk wording issues detected.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {suggestions.map((item) => (
                <div key={`${item.label}-${item.issue}`} className="rounded-xl border border-amber-100 bg-white/80 px-3 py-2">
                  <p className="text-xs font-bold text-amber-800">{item.label}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{item.issue}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{item.suggestion}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function UniversalPlatformBridge({
  text,
  noteType = "progress",
  onCopied,
}: {
  text: string;
  noteType?: string;
  onCopied?: (label: string) => void;
}) {
  const [selected, setSelected] = useState<PlatformFormat>("shiftcare");
  const [copyError, setCopyError] = useState("");
  const draft = buildPlatformDraft(text, selected, noteType);

  const copySelected = async () => {
    try {
      await copyTextWithFallback(draft);
      setCopyError("");
      onCopied?.(PLATFORM_FORMATS.find((format) => format.key === selected)?.label ?? "format");
    } catch {
      setCopyError("Copy did not complete. Select the preview text and copy it manually.");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-950 text-teal-200">
          <ClipboardCopy className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Universal Platform Bridge</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            Copy-ready for your workplace platform. No official integration claimed.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PLATFORM_FORMATS.map((format) => (
          <button
            key={format.key}
            onClick={() => setSelected(format.key)}
            className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all ${
              selected === format.key
                ? "border-aria-300 bg-aria-50 text-aria-800"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {format.label}
            <span className="mt-0.5 block text-[10px] font-medium text-slate-400">{format.description}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 max-h-36 overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 whitespace-pre-wrap">
        {draft}
      </div>
      <button onClick={copySelected} disabled={!draft} className="btn-secondary mt-3 w-full justify-center text-xs disabled:opacity-50">
        <ClipboardCopy className="h-3.5 w-3.5" /> Copy {PLATFORM_FORMATS.find((format) => format.key === selected)?.label}
      </button>
      {copyError && <p className="mt-2 text-xs font-semibold text-red-600">{copyError}</p>}
    </div>
  );
}

function evidencePackText(pack: ReturnType<typeof buildEvidencePack>) {
  const section = (title: string, items: string[]) => `${title}\n${items.length ? items.map((item) => `- ${item}`).join("\n") : "- Not enough evidence yet."}`;

  return [
    `Plan Review Evidence Pack (${pack.days} days)`,
    pack.summary,
    section("Goals/outcomes evidence", pack.goalEvidence),
    section("Support themes", pack.supportThemes),
    section("Presentation themes", pack.presentationThemes),
    section("Risks/watch items", pack.recurringRisks),
    section("Follow-up themes", pack.followUps),
    "Draft only: review before using in any formal review, funding, or provider process.",
  ].join("\n\n");
}

export function EvidencePackPanel({
  notes,
  onCopied,
}: {
  notes: EvidenceNote[];
  onCopied?: (label: string) => void;
}) {
  const [days, setDays] = useState(90);
  const pack = buildEvidencePack(notes, days);
  const max = Math.max(...pack.timeline.map((item) => item.value), 1);

  const copyPack = async () => {
    await copyTextWithFallback(evidencePackText(pack));
    onCopied?.("evidence pack");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-900 p-4 text-white">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200">
            <FileSearch className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-teal-200">Plan Review Evidence Pack</p>
            <p className="mt-1 text-sm font-semibold text-white">
              Turns note history into 30/60/90-day review themes.
            </p>
          </div>
        </div>
        <div className="flex rounded-xl border border-white/10 bg-white/5 p-0.5">
          {[30, 60, 90].map((value) => (
            <button
              key={value}
              onClick={() => setDays(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${days === value ? "bg-white text-slate-950" : "text-slate-300"}`}
            >
              {value}d
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Notes reviewed</p>
            <p className="font-display text-3xl font-bold text-white">{pack.noteCount}</p>
          </div>
          <Sparkles className="h-5 w-5 text-teal-200" />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-300">{pack.summary}</p>
        {pack.timeline.length > 0 && (
          <div className="mt-4 space-y-2">
            {pack.timeline.slice(-4).map((item) => (
              <div key={item.label} className="grid grid-cols-[3rem_1fr_2rem] items-center gap-2 text-[11px] text-slate-300">
                <span>{item.label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-300 to-cyan-300 chart-bar-pop"
                    style={{ width: `${Math.max((item.value / max) * 100, 8)}%` }}
                  />
                </div>
                <span className="text-right">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[
          ["Goal evidence", pack.goalEvidence.length],
          ["Support themes", pack.supportThemes.length],
          ["Risk/watch items", pack.recurringRisks.length],
          ["Follow-ups", pack.followUps.length],
        ].map(([label, count]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <p className="text-[11px] text-slate-400">{label}</p>
            <p className="text-lg font-bold text-white">{count}</p>
          </div>
        ))}
      </div>

      <button onClick={copyPack} className="btn-secondary mt-3 w-full justify-center border-white/10 bg-white/10 text-xs text-white hover:bg-white/15">
        <Brain className="h-3.5 w-3.5" /> Copy review pack
      </button>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        Review pack drafts are summaries only. They should be checked before review, funding, or workplace use.
      </p>
    </div>
  );
}

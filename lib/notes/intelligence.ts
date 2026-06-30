export type GoalCard = {
  id: string;
  title: string;
  plainLanguage: string;
  evidencePrompt: string;
  keywords: string[];
};

export type GoalLink = GoalCard & {
  confidence: "strong" | "possible";
  evidence: string;
};

export type DebriefQuestion = {
  id: string;
  question: string;
  why: string;
  placeholder: string;
};

export type GuardianSuggestion = {
  label: string;
  issue: string;
  suggestion: string;
};

export type EvidencePack = {
  days: number;
  noteCount: number;
  goalEvidence: string[];
  recurringRisks: string[];
  presentationThemes: string[];
  supportThemes: string[];
  followUps: string[];
  timeline: Array<{ label: string; value: number }>;
  summary: string;
};

type EvidenceNote = {
  note_type?: string | null;
  draft_text?: string | null;
  note_text?: string | null;
  created_at?: string | null;
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "being",
  "build",
  "care",
  "daily",
  "goal",
  "goals",
  "help",
  "improve",
  "increase",
  "independent",
  "participant",
  "practice",
  "skills",
  "support",
  "toward",
  "with",
  "work",
]);

const PLATFORM_LABELS = {
  shiftcare: "ShiftCare",
  lumary: "Lumary",
  brevity: "Brevity",
  caremaster: "CareMaster",
  plain: "Plain text",
  email: "Email handover",
  incident: "Incident form",
} as const;

export type PlatformFormat = keyof typeof PLATFORM_LABELS;

export const PLATFORM_FORMATS: Array<{ key: PlatformFormat; label: string; description: string }> = [
  { key: "shiftcare", label: PLATFORM_LABELS.shiftcare, description: "Clean headings and short sections for progress-note fields." },
  { key: "lumary", label: PLATFORM_LABELS.lumary, description: "Structured paragraphs with clear follow-up and outcome wording." },
  { key: "brevity", label: PLATFORM_LABELS.brevity, description: "Case-note style with goal, response, and next-step emphasis." },
  { key: "caremaster", label: PLATFORM_LABELS.caremaster, description: "Compact daily-support note with handover detail preserved." },
  { key: "plain", label: PLATFORM_LABELS.plain, description: "No markdown, no decoration, safe for any workplace system." },
  { key: "email", label: PLATFORM_LABELS.email, description: "Coordinator-friendly handover email body." },
  { key: "incident", label: PLATFORM_LABELS.incident, description: "Incident-summary layout when risk details are present." },
];

function normalizeText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s/-]/g, " ").replace(/\s+/g, " ").trim();
}

function sentenceCase(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function extractKeywords(text: string) {
  const words = normalizeText(text)
    .split(" ")
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
  return Array.from(new Set(words)).slice(0, 8);
}

function splitGoalLines(input?: string | string[] | null) {
  if (Array.isArray(input)) return input.filter(Boolean);
  if (!input) return [];
  return input
    .split(/\n|;|\|/)
    .map((goal) => goal.trim())
    .filter(Boolean);
}

export function buildGoalCards(input?: string | string[] | null): GoalCard[] {
  return splitGoalLines(input).slice(0, 8).map((goal, index) => {
    const keywords = extractKeywords(goal);
    const title = goal.length > 58 ? `${goal.slice(0, 55).trim()}...` : goal;
    return {
      id: `goal-${index + 1}`,
      title: sentenceCase(title),
      plainLanguage: `Look for moments where support helped with ${keywords.slice(0, 3).join(", ") || "this goal"}.`,
      evidencePrompt: `What did the participant do, try, choose, practise, tolerate, or complete that connects to this goal?`,
      keywords,
    };
  });
}

export function linkGoalsToNote(noteText: string, goals?: string | string[] | null): GoalLink[] {
  const normalized = normalizeText(noteText);
  return buildGoalCards(goals)
    .map((goal) => {
      const hits = goal.keywords.filter((keyword) => normalized.includes(keyword));
      if (hits.length === 0) return null;
      return {
        ...goal,
        confidence: hits.length >= 2 ? "strong" : "possible",
        evidence: `Matched note language around ${hits.slice(0, 3).join(", ")}.`,
      } satisfies GoalLink;
    })
    .filter(Boolean) as GoalLink[];
}

export function buildAdaptiveDebriefQuestions(input: string, context: Record<string, unknown> = {}, noteType = "progress"): DebriefQuestion[] {
  const text = normalizeText(`${input} ${JSON.stringify(context)}`);
  const questions: DebriefQuestion[] = [];

  if (!/(respond|response|engaged|declined|appeared|presentation|mood|calm|upset|tired|happy|anxious)/.test(text)) {
    questions.push({
      id: "participant-response",
      question: "How did the participant respond or present?",
      why: "Adds the part coordinators usually need for continuity of care.",
      placeholder: "e.g. appeared calm, needed prompting, became tired near the end",
    });
  }

  if (!/(goal|independent|practice|skill|choice|community|capacity|confidence|outcome)/.test(text)) {
    questions.push({
      id: "goal-link",
      question: "Was any goal, skill, choice, or independence worked on?",
      why: "Turns the note from task list into evidence of impact.",
      placeholder: "e.g. practised choosing items from a shopping list",
    });
  }

  if (!/(incident|risk|injur|concern|safe|unsafe|no incident|no concerns|escalat|notify)/.test(text)) {
    questions.push({
      id: "risk-check",
      question: noteType === "incident" || noteType === "risk" ? "Who was notified and what follow-up is required?" : "Any risks, incidents, injuries, or concerns to mention?",
      why: "Prevents vague safety sections and helps incident escalation stay clear.",
      placeholder: "e.g. no incidents, or supervisor notified and follow-up required",
    });
  }

  if (!/(handover|follow|next worker|next shift|continue|check|monitor|watch)/.test(text)) {
    questions.push({
      id: "handover",
      question: "What should the next worker or coordinator know?",
      why: "Makes the note useful after the shift, not just filed away.",
      placeholder: "e.g. encourage hydration and check if tiredness continues",
    });
  }

  if (!/(time|from|until|shift|morning|afternoon|evening|\d ?am|\d ?pm)/.test(text)) {
    questions.push({
      id: "shift-time",
      question: "What date or shift time should be included?",
      why: "Helps keep copied notes traceable in workplace systems.",
      placeholder: "e.g. today, 2:00pm-5:00pm",
    });
  }

  return questions.slice(0, 4);
}

export function buildDignityGuardianSuggestions(text: string): GuardianSuggestion[] {
  const suggestions: GuardianSuggestion[] = [];
  const normalized = normalizeText(text);

  const checks: Array<{ pattern: RegExp; label: string; issue: string; suggestion: string }> = [
    {
      pattern: /\b(was|were) good\b|\bgood session\b|\bfine\b/i,
      label: "Vague wording",
      issue: "Words like 'good' or 'fine' do not show observable evidence.",
      suggestion: "Describe what was observed: engaged in conversation, completed task, smiled, requested a break, or needed prompting.",
    },
    {
      pattern: /\bnon[- ]?compliant\b|\brefused\b|\baggressive\b|\bdifficult\b|\battention seeking\b/i,
      label: "Judgemental wording",
      issue: "This could sound blaming or subjective if not directly supported by facts.",
      suggestion: "Use neutral behaviour language: declined, raised voice, moved away, requested space, or did not engage at that time.",
    },
    {
      pattern: /\bprobably\b|\bobviously\b|\bintentionally\b|\bmanipulative\b|\bwanted attention\b/i,
      label: "Assumption risk",
      issue: "The note may infer intent or emotion without evidence.",
      suggestion: "Stick to what was seen, heard, said, or done. Add direct quotes where useful.",
    },
    {
      pattern: /\bno concerns?\b|\bno risks?\b/i,
      label: "No-concern wording",
      issue: "Broad no-risk or no-concern wording can overclaim if the worker only confirmed no incident.",
      suggestion: "Use precise wording such as 'No incidents were reported' only when the worker confirmed it.",
    },
    {
      pattern: /\bndis approved\b|\bguaranteed compliant\b|\blegally compliant\b|\bclinically approved\b/i,
      label: "Unsafe claim",
      issue: "Aria should never claim legal, clinical, regulator, or NDIS approval.",
      suggestion: "Use 'structured draft', 'review-ready', or 'copy-ready' instead.",
    },
  ];

  for (const check of checks) {
    if (check.pattern.test(text)) {
      suggestions.push({
        label: check.label,
        issue: check.issue,
        suggestion: check.suggestion,
      });
    }
  }

  if (normalized.length > 0 && normalized.length < 180) {
    suggestions.push({
      label: "Missing detail risk",
      issue: "The draft may be too short to explain support, response, and follow-up.",
      suggestion: "Add what support was provided, how the participant responded, goal connection, and any next-shift context.",
    });
  }

  return suggestions.slice(0, 5);
}

function cleanForPaste(text: string) {
  return text
    .replace(/\*\*/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstLines(text: string, limit = 6) {
  return cleanForPaste(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit)
    .join("\n");
}

export function buildPlatformDraft(text: string, format: PlatformFormat, noteType = "progress") {
  const clean = cleanForPaste(text);
  if (!clean) return "";

  if (format === "plain") return clean;

  if (format === "email") {
    return `Hi team,\n\nPlease see handover/update below:\n\n${firstLines(clean, 8)}\n\nPlease review and follow the usual workplace process before filing.\n\nThanks`;
  }

  if (format === "incident") {
    return `Incident / risk summary\n\n${firstLines(clean, 10)}\n\nFollow-up: Review against your organisation's incident reporting and escalation process.`;
  }

  const platformIntro: Record<Exclude<PlatformFormat, "plain" | "email" | "incident">, string> = {
    shiftcare: "ShiftCare paste-ready note",
    lumary: "Lumary paste-ready note",
    brevity: "Brevity case-note format",
    caremaster: "CareMaster daily note format",
  };

  const suffix = noteType === "incident" || noteType === "risk"
    ? "\n\nReminder: Follow your organisation's incident reporting and escalation process."
    : "\n\nDraft only: review and edit before submitting.";

  return `${platformIntro[format]}\n\n${clean}${suffix}`;
}

function lineIncludesAny(line: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(line));
}

function uniquePush(list: string[], value: string, limit = 5) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned && !list.includes(cleaned) && list.length < limit) list.push(cleaned);
}

export function buildEvidencePack(notes: EvidenceNote[], days = 90): EvidencePack {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const scoped = notes.filter((note) => {
    if (!note.created_at) return true;
    const time = new Date(note.created_at).getTime();
    return Number.isNaN(time) || time >= since;
  });

  const goalEvidence: string[] = [];
  const recurringRisks: string[] = [];
  const presentationThemes: string[] = [];
  const supportThemes: string[] = [];
  const followUps: string[] = [];
  const timelineCounts = new Map<string, number>();

  for (const note of scoped) {
    const text = cleanForPaste(note.draft_text || note.note_text || "");
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    const date = note.created_at ? new Date(note.created_at) : new Date();
    const label = Number.isNaN(date.getTime()) ? "Recent" : date.toLocaleDateString("en-AU", { month: "short" });
    timelineCounts.set(label, (timelineCounts.get(label) ?? 0) + 1);

    for (const line of lines) {
      if (lineIncludesAny(line, [/goal/i, /outcome/i, /independ/i, /skill/i, /community/i, /choice/i])) uniquePush(goalEvidence, line);
      if (lineIncludesAny(line, [/risk/i, /incident/i, /injur/i, /concern/i, /unsafe/i, /anxious/i, /distress/i])) uniquePush(recurringRisks, line);
      if (lineIncludesAny(line, [/presentation/i, /mood/i, /appeared/i, /calm/i, /tired/i, /engaged/i])) uniquePush(presentationThemes, line);
      if (lineIncludesAny(line, [/support provided/i, /supported/i, /prompt/i, /assisted/i, /transport/i, /shopping/i, /meal/i])) uniquePush(supportThemes, line);
      if (lineIncludesAny(line, [/handover/i, /follow.?up/i, /next worker/i, /next shift/i, /continue/i, /monitor/i])) uniquePush(followUps, line);
    }
  }

  const timeline = Array.from(timelineCounts.entries()).map(([label, value]) => ({ label, value }));
  const summary = scoped.length === 0
    ? "No notes available for this evidence window yet."
    : `${scoped.length} notes reviewed across ${days} days. Key themes: ${[
      goalEvidence.length ? "goal evidence" : "",
      supportThemes.length ? "support delivered" : "",
      presentationThemes.length ? "presentation changes" : "",
      recurringRisks.length ? "risk/watch items" : "",
      followUps.length ? "handover actions" : "",
    ].filter(Boolean).join(", ") || "general support activity"}.`;

  return {
    days,
    noteCount: scoped.length,
    goalEvidence,
    recurringRisks,
    presentationThemes,
    supportThemes,
    followUps,
    timeline,
    summary,
  };
}

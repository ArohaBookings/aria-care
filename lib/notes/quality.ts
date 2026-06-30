export type NoteQualityCheck = {
  label: string;
  passed: boolean;
  help: string;
};

export type CareSignal = {
  label: string;
  level: "info" | "watch" | "risk";
  detail: string;
};

type HeadingExpectation = {
  label: string;
  matches: RegExp[];
};

const PROGRESS_HEADINGS: HeadingExpectation[] = [
  { label: "Participant presentation:", matches: [/participant presentation/i, /\bpresentation\s*\/?\s*mood\b/i, /\bmood\s*\/?\s*presentation\b/i] },
  { label: "Support provided:", matches: [/\bsupports? provided\b/i, /\bsupport provided\b/i] },
  { label: "Goals/outcomes:", matches: [/\bgoals?\s*(?:or|\/|and)\s*outcomes?\b/i, /\bgoals? worked/i, /\boutcomes? worked/i, /\bindependence\b/i] },
  { label: "Mood/risk/concerns:", matches: [/\bmood\b/i, /\brisks?(?:,|\s|\/)/i, /\bconcerns?(?:,|\s|\/)/i] },
  { label: "Daily living skills:", matches: [/\bdaily living\b/i, /\bmeal prep\b/i, /\bshopping\b/i, /\bcommunity access\b/i] },
  { label: "Incidents/injuries:", matches: [/\bincidents?(?:,|\s|\/)/i, /\binjur(?:y|ies)(?:,|\s|\/)/i] },
  { label: "Handover/follow-up:", matches: [/\bhandover\b/i, /\bfollow.?up\b/i, /\bnext worker\b/i, /\bnext shift\b/i] },
];

const INCIDENT_HEADINGS: HeadingExpectation[] = [
  { label: "What happened:", matches: [/\bwhat happened\b/i, /\bincident summary\b/i] },
  { label: "When/where:", matches: [/\bwhen\/where\b/i, /\bwhen and where\b/i, /\bdate\/time\b/i] },
  { label: "Who was involved:", matches: [/\bwho was involved\b/i, /\bpeople involved\b/i] },
  { label: "Immediate response:", matches: [/\bimmediate response\b/i, /\bresponse taken\b/i] },
  { label: "Injuries/risks:", matches: [/\binjuries?\/risks?\b/i, /\binjuries?\b/i, /\brisks?\b/i] },
  { label: "Notifications/escalation:", matches: [/\bnotifications?\/escalation\b/i, /\bnotifications?\b/i, /\bescalation\b/i] },
  { label: "Follow-up required:", matches: [/\bfollow.?up required\b/i, /\bfollow.?up\b/i] },
];

const HANDOVER_HEADINGS: HeadingExpectation[] = [
  { label: "Key updates:", matches: [/\bkey updates?\b/i] },
  { label: "What worked:", matches: [/\bwhat worked\b/i] },
  { label: "What to watch:", matches: [/\bwhat to watch\b/i, /\bwatch for\b/i] },
  { label: "Next shift notes:", matches: [/\bnext shift notes?\b/i, /\bnext worker\b/i] },
  { label: "Risks/concerns:", matches: [/\brisks?\/concerns?\b/i, /\bconcerns?\b/i] },
];

const UNSAFE_WORDS = [
  "utilized",
  "non-compliant",
  "legally compliant",
  "clinically approved",
  "ndis approved",
  "guaranteed compliant",
];

function expectedHeadings(noteType?: string) {
  if (noteType === "incident" || noteType === "risk") return INCIDENT_HEADINGS;
  if (noteType === "handover") return HANDOVER_HEADINGS;
  return PROGRESS_HEADINGS;
}

function matchedHeadings(text: string, headings: HeadingExpectation[]) {
  return headings.filter((heading) => heading.matches.some((pattern) => pattern.test(text)));
}

function headingThreshold(noteType: string, total: number) {
  if (noteType === "incident" || noteType === "risk") return Math.min(5, total);
  if (noteType === "handover") return Math.min(3, total);
  return Math.min(5, total);
}

function hasUnsafeWording(text: string) {
  const normalized = text.toLowerCase();
  return UNSAFE_WORDS.some((word) => normalized.includes(word));
}

function mentionsNoIncidentWithoutContext(text: string) {
  return /\bno (incidents?|injur(?:y|ies)|concerns?|risks?)\b/i.test(text);
}

export function scoreNoteQuality(text: string, noteType = "progress") {
  const trimmed = text.trim();
  const headings = expectedHeadings(noteType);
  const matched = matchedHeadings(trimmed, headings);
  const structuredEnough = matched.length >= headingThreshold(noteType, headings.length);
  const checks: NoteQualityCheck[] = [
    {
      label: "Structured headings",
      passed: structuredEnough,
      help: "Uses enough of the expected headings for the note type.",
    },
    {
      label: "Factual wording",
      passed: !hasUnsafeWording(trimmed),
      help: "Avoids unsafe compliance claims and judgemental language.",
    },
    {
      label: "Skimmable length",
      passed: trimmed.length > 120 && trimmed.length < 2600,
      help: "Long enough to be useful, short enough to paste into a workplace platform.",
    },
    {
      label: "Handover ready",
      passed: /handover|follow-up|next shift|watch|continue|check/i.test(trimmed),
      help: "Includes clear next-shift or follow-up information where relevant.",
    },
    {
      label: "Incident clarity",
      passed: noteType === "incident" || noteType === "risk" || !mentionsNoIncidentWithoutContext(trimmed) || /reported|noted|stated|mentioned/i.test(trimmed),
      help: "Keeps incident language clear and avoids overclaiming.",
    },
  ];

  const passed = checks.filter((check) => check.passed).length;
  const score = Math.round((passed / checks.length) * 100);

  return {
    score,
    label: score >= 90 ? "Excellent" : score >= 75 ? "Strong" : score >= 55 ? "Needs review" : "Needs work",
    checks,
    missingHeadings: headings
      .filter((heading) => !matched.includes(heading))
      .map((heading) => heading.label),
  };
}

export function detectCareSignals(text: string): CareSignal[] {
  const normalized = text.toLowerCase();
  const normalizedWithoutNegatedRisk = normalized
    .replace(/\brisks?,?\s*incidents?\s*(?:or|\/)\s*concerns?:?/g, "")
    .replace(/\bincidents?\/injuries?:?/g, "")
    .replace(/\brisk(?:s)?\/concerns?:?/g, "")
    .replace(/\bmood\/risk\/concerns?:?/g, "")
    .replace(/\bno (incidents?|injur(?:y|ies)|concerns?|risks?)\b/g, "");
  const signals: CareSignal[] = [];

  if (/incident|injur|fall|unsafe|risk|escalat|restrictive|medication|abuse|neglect/.test(normalizedWithoutNegatedRisk)) {
    signals.push({
      label: "Risk or incident language",
      level: "risk",
      detail: "Review escalation steps and follow your organisation's incident process.",
    });
  }

  if (/anxious|upset|distress|agitated|overwhelmed|crowded/.test(normalized)) {
    signals.push({
      label: "Mood/presentation change",
      level: "watch",
      detail: "Useful for the next worker to understand triggers and what helped.",
    });
  }

  if (/tired|fatigue|rest|hydration|water|sleep|unwell|pain/.test(normalized)) {
    signals.push({
      label: "Health or wellbeing watch",
      level: "watch",
      detail: "Consider adding follow-up for hydration, rest, pain, or health changes if relevant.",
    });
  }

  if (/prompt|independent|goal|skill|checkout|shopping|meal|community/.test(normalized)) {
    signals.push({
      label: "Goal progress signal",
      level: "info",
      detail: "Good candidate for goals/outcomes wording and plan-review evidence over time.",
    });
  }

  if (/follow.?up|next worker|next shift|handover|check if|continue/.test(normalized)) {
    signals.push({
      label: "Handover action",
      level: "info",
      detail: "Clear next-shift context detected.",
    });
  }

  return signals.slice(0, 4);
}

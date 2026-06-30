import { buildAdaptiveDebriefQuestions, buildDignityGuardianSuggestions, buildGoalCards, linkGoalsToNote } from "./intelligence";

function cleanInput(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function sentenceFromInput(input: string) {
  const cleaned = cleanInput(input);
  if (!cleaned) return "Not specified.";
  return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
}

function hasNoIncidentStatement(input: string) {
  return /\b(no|none|nil|not any)\s+(incidents?|injur(?:y|ies)|concerns?|risks?)\b/i.test(input);
}

function extractContextValue(context: Record<string, unknown> | undefined, key: string) {
  const value = context?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function extractDebriefAnswers(context: Record<string, unknown> | undefined) {
  const answers = context?.debriefAnswers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return "";

  return Object.entries(answers as Record<string, unknown>)
    .filter(([, value]) => typeof value === "string" && value.trim())
    .map(([key, value]) => `${key}: ${(value as string).trim()}`)
    .join(". ");
}

function fallbackSections(input: string, context: Record<string, unknown> | undefined) {
  const participant = extractContextValue(context, "participant") || "Participant";
  const shiftTime = extractContextValue(context, "shiftTime");
  const supportProvided = extractContextValue(context, "supportProvided");
  const goals = extractContextValue(context, "goals");
  const mood = extractContextValue(context, "mood");
  const risks = extractContextValue(context, "risks");
  const followUp = extractContextValue(context, "followUp");

  return {
    participant,
    shiftTime,
    supportProvided,
    goals,
    mood,
    risks,
    followUp,
    workerInput: sentenceFromInput([input, extractDebriefAnswers(context)].filter(Boolean).join(". ")),
  };
}

export function buildFallbackSoloNote(args: {
  input: string;
  noteType?: string;
  detailLevel?: string;
  formattingMode?: string;
  context?: Record<string, unknown>;
}) {
  const section = fallbackSections(args.input, args.context);
  const goalLinks = linkGoalsToNote(args.input, section.goals);
  const goalCards = buildGoalCards(section.goals);
  const goalLine = goalLinks.length
    ? goalLinks.map((goal) => goal.title).join("; ")
    : goalCards.length
      ? `Possible goal connection to review: ${goalCards.map((goal) => goal.title).join("; ")}`
      : "Not specified. Add the relevant participant goal if known.";

  const incidentLine = section.risks
    ? section.risks
    : hasNoIncidentStatement(args.input)
      ? "No incidents, injuries, risks, or concerns were reported in the worker input."
      : "Not specified. Do not add no-incident wording unless confirmed.";

  const NOTE_TITLES: Record<string, string> = {
    handover: "Handover Note",
    incident: "Incident / Risk Note",
    risk: "Incident / Risk Note",
    support_summary: "Support Summary",
    participant_friendly: "Participant-friendly summary",
    dot_point: "Dot-point note",
    coordinator_summary: "Coordinator summary",
    daily_snapshot: "Daily snapshot",
  };
  const noteTitle = NOTE_TITLES[args.noteType ?? ""] ?? "Progress Note";

  const noteText = `${noteTitle}

Participant presentation:
${section.mood || "Not specified. Add observable mood/presentation if relevant."}

Support provided:
${section.supportProvided || section.workerInput}${section.shiftTime ? `\nShift time: ${section.shiftTime}` : ""}

Goals/outcomes:
${goalLine}

Mood/risk/concerns:
${incidentLine}

Daily living skills:
Review the worker input for practical skills, community access, choice-making, prompting, or independence evidence.

Incidents/injuries:
${incidentLine}

Handover/follow-up:
${section.followUp || "Not specified. Add next-shift instructions if needed."}

Optional details you may want to add:
${buildAdaptiveDebriefQuestions(args.input, args.context, args.noteType).map((q) => `- ${q.question}`).join("\n")}

Draft only — please review and edit before submitting to your workplace system.`;

  const participantSummary = `Participant-friendly summary

Here is a plain-language summary of today's support. Please review and edit it so it is accurate and suitable to read with you.

What we did today: ${section.supportProvided || section.workerInput}${section.mood ? `\nHow things went: ${section.mood}` : ""}${section.followUp ? `\nWhat's next: ${section.followUp}` : ""}

Draft only — review and edit before sharing.`;

  const isParticipantFriendly = args.noteType === "participant_friendly";
  const finalNoteText = isParticipantFriendly ? participantSummary : noteText;
  const guardian = buildDignityGuardianSuggestions(finalNoteText);

  return {
    noteText: finalNoteText,
    shortText: `${noteTitle}: ${section.workerInput}`,
    handoverSummary: section.followUp || "",
    incidentSummary: section.risks || (hasNoIncidentStatement(args.input) ? "No incidents were reported in the worker input." : ""),
    participantSummary,
    noteType: (args.noteType || "progress") as "progress" | "incident" | "handover" | "risk" | "support_summary" | "participant_friendly" | "dot_point" | "coordinator_summary" | "daily_snapshot",
    riskFlagged: /incident|risk|injur|concern|unsafe|escalat/i.test(`${args.input} ${section.risks}`) && !hasNoIncidentStatement(args.input),
    reviewReminder: guardian.length
      ? "Fallback draft created. Please review the highlighted quality suggestions before submitting."
      : "Aria creates drafts only. Always review and edit before submitting to your workplace system.",
    fallbackUsed: true,
  };
}

export function buildFallbackProgressNote(input: string, participantContext: { name: string; goals?: string[] }) {
  const goalLinks = linkGoalsToNote(input, participantContext.goals);
  const goalText = goalLinks.length
    ? goalLinks.map((goal) => goal.title).join("; ")
    : participantContext.goals?.length
      ? `Possible goal connection to review: ${participantContext.goals.join("; ")}`
      : "Not specified.";
  const noIncident = hasNoIncidentStatement(input);
  const incidentText = noIncident ? "No incidents, injuries, risks, or concerns were reported in the worker input." : "Not specified. Only add no-incident wording if confirmed.";
  const noteText = `Progress Note

Participant presentation:
Not specified. Add observable mood/presentation if relevant.

Support provided:
${sentenceFromInput(input)}

Goals/outcomes:
${goalText}

Mood/risk/concerns:
${incidentText}

Daily living skills:
Review the worker input for practical skills, community access, choice-making, prompting, or independence evidence.

Incidents/injuries:
${incidentText}

Handover/follow-up:
Not specified. Add next-shift instructions if needed.

Optional details you may want to add:
${buildAdaptiveDebriefQuestions(input, { goals: participantContext.goals?.join("; ") }, "progress").map((q) => `- ${q.question}`).join("\n")}

Draft only — please review and edit before submitting to your workplace system.`;

  return {
    noteText,
    goalsReferenced: goalLinks.map((goal) => goal.title),
    supportLevel: "not_specified",
    mood: "not_specified",
    incidentFlagged: /incident|risk|injur|concern|unsafe|escalat/i.test(input) && !noIncident,
    suggestedReview: true,
    suggestedReviewReason: "Fallback draft created because AI generation was unavailable. Review and add missing details before filing.",
  };
}

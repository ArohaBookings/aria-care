import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import {
  PROGRESS_NOTE_PROMPT,
  SUPPORT_PLAN_PROMPT,
  INCIDENT_REPORT_PROMPT,
  EMAIL_DRAFT_PROMPT,
  HANDOVER_NOTE_PROMPT,
  SOLO_NOTE_PROMPT,
} from "./prompts";
import { buildFallbackProgressNote, buildFallbackSoloNote } from "@/lib/notes/fallbacks";

// ============================================================
// MODEL ROUTER — tries OpenAI first, falls back to Anthropic
// Swap or extend here without touching any other file
// ============================================================

async function callAI(systemPrompt: string, userContent: string): Promise<string> {
  // Try OpenAI first
  if (process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  }

  // Fallback to Anthropic Claude
  if (process.env.ANTHROPIC_API_KEY) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: systemPrompt + "\n\nCRITICAL: Return ONLY valid JSON. No markdown, no explanation.",
      messages: [{ role: "user", content: userContent }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    return text.replace(/```json\n?|```/g, "").trim();
  }

  throw new Error("No AI API key configured. Add OPENAI_API_KEY or ANTHROPIC_API_KEY to your environment.");
}

function parseJSON<T>(text: string): T {
  const clean = text.replace(/```json\n?|```/g, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]) as T;
  return JSON.parse(clean) as T;
}

const DRAFT_ONLY_REMINDER = "Draft only — please review and edit before submitting to your workplace system.";

const PROGRESS_NOTE_HEADINGS = [
  "Participant presentation:",
  "Support provided:",
  "Goals/outcomes:",
  "Mood/risk/concerns:",
  "Daily living skills:",
  "Incidents/injuries:",
  "Handover/follow-up:",
];

const INCIDENT_NOTE_HEADINGS = [
  "What happened:",
  "When/where:",
  "Who was involved:",
  "Immediate response:",
  "Injuries/risks:",
  "Notifications/escalation:",
  "Follow-up required:",
];

const HANDOVER_NOTE_HEADINGS = [
  "Key updates:",
  "What worked:",
  "What to watch:",
  "Next shift notes:",
  "Risks/concerns:",
];

const ALWAYS_AVOID_PHRASES = [
  "utilized",
  "proceeded comfortably",
  "demonstrated significant improvement",
  "it is recommended",
  "non-compliant",
  "ndis compliant",
  "legally compliant",
  "clinically approved",
  "guaranteed safe",
];

function includesHeading(text: string, heading: string) {
  return text.toLowerCase().includes(heading.toLowerCase());
}

function noteInputSupportsNoIncidentStatement(input: string) {
  return /\b(no|none|nil|not any)\s+(incidents?|injur(?:y|ies)|concerns?|risks?)\b/i.test(input)
    || /\bno (incidents?|injur(?:y|ies)|concerns?|risks?) (noted|reported|to report)\b/i.test(input);
}

function qualityIssuesForNote(noteText: string, sourceInput: string, noteType: string) {
  const issues: string[] = [];
  const lowerNote = noteText.toLowerCase();
  const lowerInput = sourceInput.toLowerCase();
  const expectedHeadings = noteType === "incident" || noteType === "risk"
    ? INCIDENT_NOTE_HEADINGS
    : noteType === "handover"
      ? HANDOVER_NOTE_HEADINGS
      : noteType === "progress"
        ? PROGRESS_NOTE_HEADINGS
        : [];

  const missingHeadings = expectedHeadings.filter((heading) => !includesHeading(noteText, heading));
  if (missingHeadings.length) {
    issues.push(`Add the required headings: ${missingHeadings.join(", ")}`);
  }

  const badPhrases = ALWAYS_AVOID_PHRASES.filter((phrase) => lowerNote.includes(phrase));
  if (badPhrases.length) {
    issues.push(`Replace unsupported or unsafe wording: ${badPhrases.join(", ")}`);
  }

  if (lowerNote.includes("refused") && !lowerInput.includes("refused")) {
    issues.push("Avoid 'refused' unless the worker explicitly used that wording; use plain factual wording instead.");
  }

  if (lowerNote.includes("aggressive") && !lowerInput.includes("aggressive")) {
    issues.push("Avoid 'aggressive' unless explicitly stated and contextually necessary.");
  }

  const noteSaysNoIncidents = /\bno (incidents?|injur(?:y|ies)|concerns?|risks?)\b/i.test(noteText)
    || /\bno incidents\/injuries\b/i.test(noteText);
  if (noteSaysNoIncidents && !noteInputSupportsNoIncidentStatement(sourceInput)) {
    issues.push("Do not mention no incidents, injuries, risks, or concerns unless the worker stated that.");
  }

  if (noteText.length > 2600) {
    issues.push("Shorten the note so it is easy to skim and paste into a workplace platform.");
  }

  return issues;
}

async function generateReviewedJSON<T>({
  systemPrompt,
  userContent,
  getIssues,
}: {
  systemPrompt: string;
  userContent: string;
  getIssues: (result: T) => string[];
}): Promise<T> {
  let best: T | null = null;
  let issues: string[] = [];

  for (let pass = 1; pass <= 3; pass += 1) {
    const content = pass === 1
      ? userContent
      : `${userContent}

QUALITY REVIEW FEEDBACK FROM PREVIOUS DRAFT:
- ${issues.join("\n- ")}

PREVIOUS JSON DRAFT:
${JSON.stringify(best, null, 2)}

Revise the draft so it passes the quality review. Return valid JSON only.`;

    const raw = await callAI(systemPrompt, content);
    const parsed = parseJSON<T>(raw);
    best = parsed;
    issues = getIssues(parsed);
    if (issues.length === 0) return parsed;
  }

  if (!best) throw new Error("AI generation failed before producing a draft.");
  return best;
}

// ============================================================
// PROGRESS NOTE from voice transcript or bullet points
// ============================================================
export interface ProgressNoteResult {
  noteText: string;
  goalsReferenced: string[];
  supportLevel: string;
  mood: string;
  incidentFlagged: boolean;
  suggestedReview: boolean;
  suggestedReviewReason: string;
  fallbackMode?: boolean;
}

export async function generateProgressNote(
  transcript: string,
  participantContext: { name: string; goals?: string[]; diagnoses?: string[] }
): Promise<ProgressNoteResult> {
  const userContent = `PARTICIPANT CONTEXT:
Name: ${participantContext.name}
Goals: ${participantContext.goals?.join(", ") || "Not specified"}
Diagnoses/Conditions: ${participantContext.diagnoses?.join(", ") || "Not specified"}

SUPPORT WORKER INPUT:
${transcript}`;

  try {
    return await generateReviewedJSON<ProgressNoteResult>({
      systemPrompt: PROGRESS_NOTE_PROMPT,
      userContent,
      getIssues: (result) => qualityIssuesForNote(result.noteText ?? "", transcript, "progress"),
    });
  } catch (error) {
    console.error("[ai] Progress note generation fallback:", error);
    return {
      ...buildFallbackProgressNote(transcript, participantContext),
      fallbackMode: true,
    };
  }
}

// ============================================================
// SUPPORT PLAN
// ============================================================
export interface SupportPlanResult {
  summary: string;
  longTermGoals: Array<{ goalNumber: number; goalText: string; supportCategory: string; strategies: string[]; outcomeIndicators: string[]; reviewDate: string }>;
  shortTermGoals: Array<{ goalNumber: number; goalText: string; supportCategory: string; strategies: string[]; outcomeIndicators: string[]; reviewDate: string }>;
  riskConsiderations: string[];
  communicationPreferences: string;
  keyStrengths: string[];
}

export async function generateSupportPlan(participantInfo: {
  name: string; age: number; diagnoses: string[]; currentSupports: string;
  participantGoals: string; livingArrangement: string; ndisNumber?: string;
}): Promise<SupportPlanResult> {
  const userContent = `Generate a support plan for:
Name: ${participantInfo.name}
Age: ${participantInfo.age}
Diagnoses: ${participantInfo.diagnoses.join(", ")}
Current Supports: ${participantInfo.currentSupports}
Participant's Own Goals/Aspirations: ${participantInfo.participantGoals}
Living Arrangement: ${participantInfo.livingArrangement}`;

  const result = await callAI(SUPPORT_PLAN_PROMPT, userContent);
  return parseJSON<SupportPlanResult>(result);
}

// ============================================================
// INCIDENT REPORT
// ============================================================
export interface IncidentReportResult {
  incidentDate: string;
  incidentTime: string;
  incidentType: string;
  severity: string;
  isReportableToNDIS: boolean;
  reportableReason: string;
  narrative: string;
  immediateActionsText: string;
  followUpRequired: string[];
  witnessesPresent: boolean;
  injuryDescription: string;
  locationDescription: string;
}

export async function generateIncidentReport(description: string, participantName: string, workerName: string): Promise<IncidentReportResult> {
  const userContent = `Participant: ${participantName}\nSupport Worker: ${workerName}\n\nIncident Description:\n${description}`;
  const result = await callAI(INCIDENT_REPORT_PROMPT, userContent);
  return parseJSON<IncidentReportResult>(result);
}

// ============================================================
// EMAIL DRAFT
// ============================================================
export interface EmailResult { subject: string; body: string; }

export async function generateEmail(context: string): Promise<EmailResult> {
  const result = await callAI(EMAIL_DRAFT_PROMPT, context);
  return parseJSON<EmailResult>(result);
}

// ============================================================
// HANDOVER NOTE
// ============================================================
export interface HandoverResult {
  handoverText: string;
  urgentItems: string[];
  medicationNotes: string;
  upcomingAppointments: string[];
}

export async function generateHandoverNote(transcript: string, participantName: string): Promise<HandoverResult> {
  const userContent = `Participant: ${participantName}\n\nWorker notes:\n${transcript}`;
  const result = await callAI(HANDOVER_NOTE_PROMPT, userContent);
  return parseJSON<HandoverResult>(result);
}

export interface SoloNoteResult {
  noteText: string;
  shortText: string;
  handoverSummary: string;
  incidentSummary: string;
  participantSummary: string;
  noteType: "progress" | "incident" | "handover" | "risk" | "support_summary" | "participant_friendly";
  riskFlagged: boolean;
  reviewReminder: string;
  fallbackUsed?: boolean;
}

export async function generateSoloNoteDraft(args: {
  input: string;
  noteType: string;
  detailLevel: string;
  country?: string;
  formattingMode?: string;
  context?: Record<string, unknown>;
}): Promise<SoloNoteResult> {
  const userContent = `NOTE TYPE: ${args.noteType}
COUNTRY: ${args.country ?? "Australia"}
DETAIL LEVEL: ${args.detailLevel}
OUTPUT FORMAT: ${args.formattingMode ?? "structured headings"}

OPTIONAL CONTEXT:
${JSON.stringify(args.context ?? {}, null, 2)}

SUPPORT WORKER INPUT:
${args.input}`;

  try {
    const result = await generateReviewedJSON<SoloNoteResult>({
      systemPrompt: SOLO_NOTE_PROMPT,
      userContent,
      getIssues: (draft) => {
        const generatedType = draft.noteType || args.noteType;
        const qualityType = args.formattingMode === "handover_only"
          ? "handover"
          : args.formattingMode === "incident_summary"
            ? "incident"
            : generatedType;
        const issues = qualityIssuesForNote(draft.noteText ?? "", args.input, qualityType);
        if (!draft.reviewReminder?.toLowerCase().includes("draft")) {
          issues.push("Include the draft-only human review reminder.");
        }
        return issues;
      },
    });

    return {
      ...result,
      participantSummary: result.participantSummary?.trim()
        || result.shortText?.trim()
        || result.noteText?.trim()
        || "",
      reviewReminder: result.reviewReminder || DRAFT_ONLY_REMINDER,
    };
  } catch (error) {
    console.error("[ai] Solo note generation fallback:", error);
    return buildFallbackSoloNote({
      input: args.input,
      noteType: args.noteType,
      detailLevel: args.detailLevel,
      formattingMode: args.formattingMode,
      context: args.context,
    });
  }
}

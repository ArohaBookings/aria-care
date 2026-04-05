import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import {
  PROGRESS_NOTE_PROMPT,
  SUPPORT_PLAN_PROMPT,
  INCIDENT_REPORT_PROMPT,
  EMAIL_DRAFT_PROMPT,
  HANDOVER_NOTE_PROMPT,
} from "./prompts";

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

  const result = await callAI(PROGRESS_NOTE_PROMPT, userContent);
  return parseJSON<ProgressNoteResult>(result);
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

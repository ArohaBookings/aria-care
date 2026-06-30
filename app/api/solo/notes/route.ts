import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSoloNoteDraft } from "@/lib/ai/generate";
import { sendFirstNoteCreatedEmail, sendFreeLimitReachedEmail, sendFreeUsageNearingLimitEmail } from "@/lib/email/send";
import { sanitizeUserInput } from "@/lib/security";
import {
  nextSoloPaidPlan,
  normalizeSoloPlan,
  soloMonthlyNoteLimit,
} from "@/lib/usage-limits";

export const maxDuration = 60;

const SOLO_NOTE_TYPES = new Set(["progress", "incident", "handover", "risk", "support_summary", "participant_friendly"]);
const FREE_NOTE_TYPES = new Set(["progress"]);
const SIGNOFF_STATUSES = new Set(["confirmed", "declined", "not_applicable", ""]);
const PUBLIC_ERROR_PATTERNS = [
  /Unauthorized/i,
  /Solo mode is not enabled/i,
  /Profile not found/i,
  /Invalid note type/i,
  /Free Solo includes/i,
  /Please add at least/i,
  /Input is too short/i,
  /used your free notes/i,
];

function monthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function isSoloProfile(profile: any) {
  const org = profile?.organisations as { product_mode?: string; subscription_tier?: string } | null;
  return profile?.account_type === "solo" || org?.product_mode === "solo" || org?.subscription_tier?.startsWith("solo");
}

function publicErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (PUBLIC_ERROR_PATTERNS.some((pattern) => pattern.test(message))) return message;
  return fallback;
}

async function getSoloState(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile, error } = await supabase
    .from("users")
    .select("organisation_id, email, full_name, account_type, onboarding_profile, solo_usage_reset_at, organisations(subscription_tier, product_mode, billing_country, solo_note_limit_override, solo_platform)")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    throw new Error(error?.message ?? "Profile not found");
  }

  if (!isSoloProfile(profile)) {
    return { profile, org: profile.organisations as any, isSolo: false, used: 0, limit: 0 };
  }

  const org = profile.organisations as {
    subscription_tier?: string;
    product_mode?: string;
    billing_country?: string;
    solo_note_limit_override?: number | null;
    solo_platform?: string | null;
  } | null;
  const plan = normalizeSoloPlan(org?.subscription_tier);
  const limit = soloMonthlyNoteLimit(plan, org?.solo_note_limit_override ?? null);

  const countFrom = profile.solo_usage_reset_at && new Date(profile.solo_usage_reset_at) > new Date(monthStartIso())
    ? profile.solo_usage_reset_at
    : monthStartIso();

  const { count } = await supabase
    .from("solo_notes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", countFrom);

  return {
    profile,
    org,
    isSolo: true,
    plan,
    limit,
    used: count ?? 0,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const state = await getSoloState(supabase, user.id);
    if (!state.isSolo) {
      return NextResponse.json({ error: "Solo mode is not enabled for this account" }, { status: 403 });
    }

    const { data: notes, error } = await supabase
      .from("solo_notes")
      .select("id, note_type, input_method, context, draft_text, short_text, handover_text, incident_text, participant_text, signoff, raw_input, detail_level, formatting_mode, status, copied_at, submitted_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw error;

    return NextResponse.json({
      plan: state.plan,
      country: state.org?.billing_country ?? "AU",
      platform: state.org?.solo_platform ?? null,
      usage: {
        used: state.used,
        limit: state.limit,
        remaining: Math.max(state.limit - state.used, 0),
      },
      notes: notes ?? [],
    });
  } catch (error) {
    console.error("[solo/notes] GET error:", error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to load Solo notes. Please refresh and try again.") },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const state = await getSoloState(supabase, user.id);
    if (!state.isSolo) {
      return NextResponse.json({ error: "Solo mode is not enabled for this account" }, { status: 403 });
    }

    if (state.used >= state.limit) {
      return NextResponse.json(
        {
          error: "You've used your free notes this month. Upgrade to keep creating structured notes, or come back next month.",
          code: "SOLO_NOTE_LIMIT_REACHED",
          usage: { used: state.used, limit: state.limit, remaining: 0 },
          upgradePlan: nextSoloPaidPlan(state.plan),
          upgradeUrl: "/billing?reason=solo-note-limit",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const input = typeof body.input === "string" ? body.input : "";
    const noteType = typeof body.noteType === "string" ? body.noteType : "progress";
    const detailLevel = typeof body.detailLevel === "string" ? body.detailLevel : "balanced";
    const inputMethod = body.inputMethod === "voice" ? "voice" : "text";
    const formattingMode = typeof body.formattingMode === "string" ? body.formattingMode : "structured";
    const supportLog = body.supportLog === true;
    const baseContext = typeof body.context === "object" && body.context ? body.context : {};
    const context = supportLog ? { ...baseContext, supportLog: true } : baseContext;

    if (!SOLO_NOTE_TYPES.has(noteType)) {
      return NextResponse.json({ error: "Invalid note type" }, { status: 400 });
    }

    if (state.plan === "solo_free" && !FREE_NOTE_TYPES.has(noteType)) {
      return NextResponse.json(
        {
          error: "Free Solo includes basic progress notes. Upgrade to create incident, handover, risk, and support summary drafts.",
          code: "SOLO_UPGRADE_REQUIRED",
          upgradePlan: "solo",
          upgradeUrl: "/billing?reason=solo-note-type",
        },
        { status: 403 }
      );
    }

    if (!input.trim() || input.trim().length < 10) {
      return NextResponse.json({ error: "Please add at least a few details from the shift." }, { status: 400 });
    }

    const { text: safeInput, redacted } = sanitizeUserInput(input);
    if (redacted) console.warn(`[solo/notes] prompt injection redacted user=${user.id}`);
    if (safeInput.length < 10) {
      return NextResponse.json({ error: "Input is too short after sanitization." }, { status: 400 });
    }

    const result = await generateSoloNoteDraft({
      input: safeInput,
      noteType,
      detailLevel,
      formattingMode,
      country: state.org?.billing_country ?? "AU",
      context,
    });

    const { data: note, error } = await supabase
      .from("solo_notes")
      .insert({
        user_id: user.id,
        organisation_id: state.profile.organisation_id,
        note_type: noteType,
        input_method: inputMethod,
        raw_input: safeInput,
        context,
        draft_text: result.noteText,
        short_text: result.shortText,
        handover_text: result.handoverSummary || null,
        incident_text: result.incidentSummary || null,
        // Never surface a participant-facing version of an incident/risk note.
        participant_text: (noteType === "incident" || noteType === "risk") ? null : (result.participantSummary || null),
        detail_level: detailLevel,
        formatting_mode: formattingMode,
        status: "draft",
      })
      .select("id, note_type, input_method, context, draft_text, short_text, handover_text, incident_text, participant_text, signoff, raw_input, detail_level, formatting_mode, status, copied_at, submitted_at, created_at")
      .single();

    if (error) throw error;

    const recipient = state.profile.email || user.email;
    const fullName = state.profile.full_name || user.email || "there";
    const remainingAfter = Math.max(state.limit - state.used - 1, 0);
    if (recipient && state.profile.organisation_id) {
      const lifecycleEmails: Array<Promise<unknown>> = [];
      if (state.used === 0) {
        lifecycleEmails.push(sendFirstNoteCreatedEmail({
          to: recipient,
          organisationId: state.profile.organisation_id,
          fullName,
          userId: user.id,
          noteId: note.id,
        }));
      }
      if (state.plan === "solo_free" && remainingAfter === 1) {
        lifecycleEmails.push(sendFreeUsageNearingLimitEmail({
          to: recipient,
          organisationId: state.profile.organisation_id,
          fullName,
          userId: user.id,
        }));
      }
      if (state.plan === "solo_free" && remainingAfter === 0) {
        lifecycleEmails.push(sendFreeLimitReachedEmail({
          to: recipient,
          organisationId: state.profile.organisation_id,
          fullName,
          userId: user.id,
        }));
      }
      await Promise.all(lifecycleEmails);
    }

    return NextResponse.json({
      note,
      riskFlagged: result.riskFlagged,
      reviewReminder: result.reviewReminder,
      fallbackUsed: result.fallbackUsed ?? false,
      usage: {
        used: state.used + 1,
        limit: state.limit,
        remaining: remainingAfter,
      },
    });
  } catch (error) {
    console.error("[solo/notes] POST error:", error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Aria could not finish that draft. Your input is preserved, so please retry or use Type bullet points when reception improves.") },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const noteId = typeof body.noteId === "string" ? body.noteId : "";
    const action = typeof body.action === "string" ? body.action : "";

    if (!noteId) return NextResponse.json({ error: "noteId is required" }, { status: 400 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (action === "copied") updates.copied_at = new Date().toISOString();
    if (action === "submitted") {
      updates.submitted_at = new Date().toISOString();
      updates.status = "submitted";
    }
    if (typeof body.draftText === "string") updates.draft_text = body.draftText;
    if (typeof body.participantText === "string") updates.participant_text = body.participantText.slice(0, 8000);

    if (body.signoff && typeof body.signoff === "object" && !Array.isArray(body.signoff)) {
      const raw = body.signoff as Record<string, unknown>;
      const str = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
      const status = typeof raw.status === "string" && SIGNOFF_STATUSES.has(raw.status) ? raw.status : "";
      updates.signoff = {
        status,
        participantComment: str(raw.participantComment, 4000),
        participantName: str(raw.participantName, 200),
        staffName: str(raw.staffName, 200),
        confirmed: raw.confirmed === true,
        signedAt: str(raw.signedAt, 40) || new Date().toISOString(),
        savedAt: new Date().toISOString(),
      };
    }

    const { data, error } = await supabase
      .from("solo_notes")
      .update(updates)
      .eq("id", noteId)
      .eq("user_id", user.id)
      .select("id, draft_text, participant_text, signoff, status, copied_at, submitted_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ note: data });
  } catch (error) {
    console.error("[solo/notes] PATCH error:", error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Failed to update this Solo note. Please retry.") },
      { status: 500 }
    );
  }
}

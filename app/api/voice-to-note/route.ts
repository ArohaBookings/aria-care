import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateProgressNote } from "@/lib/ai/generate";
import { rateLimit, rlKey, sanitizeUserInput } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit: 20 AI note generations per user per hour.
    const rl = rateLimit(rlKey(user.id, "voice-to-note"), 20);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in an hour." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { data: profile } = await supabase
      .from("users")
      .select("organisation_id, full_name, role")
      .eq("id", user.id)
      .single();
    if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation found" }, { status: 400 });

    // Check subscription limits
    const { data: org } = await supabase
      .from("organisations")
      .select("subscription_tier, subscription_status, trial_ends_at")
      .eq("id", profile.organisation_id)
      .single();

    const isTrial = org?.subscription_tier === "trial";
    const trialExpired = isTrial && org?.trial_ends_at && new Date(org.trial_ends_at) < new Date();
    if (trialExpired) {
      return NextResponse.json({ error: "Your free trial has expired. Please upgrade to continue." }, { status: 403 });
    }

    const body = await request.json();
    const { transcript, participantId, shiftDate, shiftStart, shiftEnd, inputMethod = "voice" } = body;

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 10) {
      return NextResponse.json({ error: "Please provide a transcript or voice memo text." }, { status: 400 });
    }

    if (!participantId) {
      return NextResponse.json({ error: "Please select a participant." }, { status: 400 });
    }

    // Sanitize the raw user input before it ever touches an AI model.
    const { text: safeTranscript, redacted } = sanitizeUserInput(transcript);
    if (redacted) {
      console.warn(`[voice-to-note] prompt injection attempt redacted user=${user.id}`);
    }
    if (safeTranscript.length < 10) {
      return NextResponse.json({ error: "Transcript is too short after sanitization." }, { status: 400 });
    }

    // Get participant context
    const { data: participant } = await supabase
      .from("participants")
      .select("full_name, diagnoses, goals, support_needs")
      .eq("id", participantId)
      .eq("organisation_id", profile.organisation_id)
      .single();

    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 });

    // Generate with AI — use the sanitized transcript
    const result = await generateProgressNote(safeTranscript, {
      name: participant.full_name,
      goals: participant.goals ?? [],
      diagnoses: participant.diagnoses ?? [],
    });

    // Save to database
    const { data: note, error: saveError } = await supabase
      .from("progress_notes")
      .insert({
        organisation_id: profile.organisation_id,
        participant_id: participantId,
        author_id: user.id,
        author_name: profile.full_name ?? user.email,
        shift_date: shiftDate ?? new Date().toISOString().split("T")[0],
        shift_start: shiftStart ?? null,
        shift_end: shiftEnd ?? null,
        input_method: inputMethod,
        raw_input: safeTranscript,
        note_text: result.noteText,
        goals_referenced: result.goalsReferenced,
        support_level: result.supportLevel,
        mood: result.mood,
        incident_flagged: result.incidentFlagged,
        suggested_review: result.suggestedReview,
        suggested_review_reason: result.suggestedReviewReason,
        // Auto-approve for support workers — coordinators/owners can review
        status: profile.role === "support_worker" ? "pending" : "approved",
      })
      .select("id")
      .single();

    if (saveError) throw saveError;

    // If incident flagged, create a draft incident report record
    if (result.incidentFlagged && note) {
      await supabase.from("incident_reports").insert({
        organisation_id: profile.organisation_id,
        participant_id: participantId,
        reported_by: user.id,
        reporter_name: profile.full_name ?? user.email,
        report_data: {
          source_note_id: note.id,
          draft: true,
          description: "Auto-flagged from progress note — please complete this incident report.",
        },
        severity: "medium",
        status: "open",
      });
    }

    return NextResponse.json({
      success: true,
      noteId: note?.id,
      result,
      incidentCreated: result.incidentFlagged,
    });

  } catch (error) {
    console.error("Voice-to-note error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate note. Please try again." },
      { status: 500 }
    );
  }
}

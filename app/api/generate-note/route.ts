import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateProgressNote } from "@/lib/ai/generate";
import { rateLimit, rlKey, sanitizeUserInput } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(rlKey(user.id, "generate-note"), 20);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in an hour." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { data: profile } = await supabase
      .from("users")
      .select("organisation_id, full_name")
      .eq("id", user.id)
      .single();
    if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation found" }, { status: 400 });

    // Check trial expiry
    const { data: org } = await supabase
      .from("organisations")
      .select("subscription_tier, trial_ends_at")
      .eq("id", profile.organisation_id)
      .single();

    const isTrial = org?.subscription_tier === "trial";
    const trialExpired = isTrial && org?.trial_ends_at && new Date(org.trial_ends_at) < new Date();
    if (trialExpired) {
      return NextResponse.json({ error: "Your free trial has expired. Please upgrade to continue." }, { status: 403 });
    }

    const body = await request.json();
    const { transcript, participantId } = body;

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 10) {
      return NextResponse.json({ error: "Please provide a transcript or voice memo text." }, { status: 400 });
    }

    if (!participantId) {
      return NextResponse.json({ error: "Please select a participant." }, { status: 400 });
    }

    const { text: safeTranscript, redacted } = sanitizeUserInput(transcript);
    if (redacted) console.warn(`[generate-note] prompt injection redacted user=${user.id}`);
    if (safeTranscript.length < 10) {
      return NextResponse.json({ error: "Transcript too short after sanitization." }, { status: 400 });
    }

    // Get participant context (org-scoped via RLS)
    const { data: participant } = await supabase
      .from("participants")
      .select("full_name, diagnoses, goals")
      .eq("id", participantId)
      .eq("organisation_id", profile.organisation_id)
      .single();

    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 });

    const note = await generateProgressNote(safeTranscript, {
      name: participant.full_name,
      goals: participant.goals ?? [],
      diagnoses: participant.diagnoses ?? [],
    });

    return NextResponse.json({ note });

  } catch (error) {
    console.error("Generate note error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate note. Please try again." },
      { status: 500 }
    );
  }
}

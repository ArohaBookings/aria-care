import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateSupportPlan,
  generateIncidentReport,
  generateHandoverNote,
  generateEmail,
} from "@/lib/ai/generate";
import { rateLimit, rlKey, sanitizeUserInput } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(rlKey(user.id, "generate-document"), 20);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in an hour." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    // Check trial expiry — same rule as other AI endpoints.
    const { data: orgForTrial } = await supabase
      .from("users")
      .select("organisation_id, organisations(subscription_tier, trial_ends_at)")
      .eq("id", user.id)
      .single();
    const org = (orgForTrial as unknown as { organisations: { subscription_tier: string; trial_ends_at: string | null } | null } | null)?.organisations;
    if (org?.subscription_tier === "trial" && org?.trial_ends_at && new Date(org.trial_ends_at) < new Date()) {
      return NextResponse.json({ error: "Your free trial has expired. Please upgrade to continue." }, { status: 403 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("organisation_id, full_name, role")
      .eq("id", user.id)
      .single();
    if (!profile?.organisation_id) return NextResponse.json({ error: "No organisation" }, { status: 400 });

    const body = await request.json();
    const { type, participantId, data: rawInputData } = body as {
      type?: string;
      participantId?: string;
      data?: {
        age?: number;
        description?: string;
        notes?: string;
        context?: string;
        participantName?: string;
        participantGoals?: string;
        currentSupports?: string;
        livingArrangement?: string;
      };
    };

    if (!type) return NextResponse.json({ error: "Document type required" }, { status: 400 });

    // Sanitize any free-text fields in the payload before they reach the model.
    const inputData = { ...(rawInputData ?? {}) };
    const textFields = ["description", "notes", "context", "participantGoals", "currentSupports", "livingArrangement"] as const;
    for (const key of textFields) {
      const v = inputData[key];
      if (typeof v === "string") {
        const { text, redacted } = sanitizeUserInput(v);
        if (redacted) console.warn(`[generate-document] prompt injection redacted field=${key} user=${user.id}`);
        inputData[key] = text;
      }
    }

    // Fetch participant if needed
    let participant: { full_name: string; diagnoses: string[]; goals: string[]; date_of_birth: string | null; support_needs: string | null; living_arrangement: string | null } | null = null;
    if (participantId) {
      const { data } = await supabase
        .from("participants")
        .select("full_name, diagnoses, goals, date_of_birth, support_needs, living_arrangement")
        .eq("id", participantId)
        .eq("organisation_id", profile.organisation_id)
        .single();
      participant = data;
    }

    let result;

    switch (type) {
      case "support_plan": {
        if (!participant) return NextResponse.json({ error: "Participant required for support plan" }, { status: 400 });
        const age = participant.date_of_birth
          ? Math.floor((Date.now() - new Date(participant.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : inputData?.age ?? 30;

        result = await generateSupportPlan({
          name: participant.full_name,
          age,
          diagnoses: participant.diagnoses ?? [],
          currentSupports: participant.support_needs ?? inputData?.currentSupports ?? "Not specified",
          participantGoals: inputData?.participantGoals ?? participant.goals?.join(", ") ?? "To be discussed",
          livingArrangement: participant.living_arrangement ?? inputData?.livingArrangement ?? "Not specified",
        });

        // Save to DB
        if (participantId) {
          await supabase.from("support_plans").insert({
            organisation_id: profile.organisation_id,
            participant_id: participantId,
            created_by: user.id,
            plan_data: result,
            status: "draft",
          });
        }
        break;
      }

      case "incident_report": {
        if (!inputData?.description) return NextResponse.json({ error: "Incident description required" }, { status: 400 });
        result = await generateIncidentReport(
          inputData.description,
          participant?.full_name ?? inputData?.participantName ?? "Unknown participant",
          profile.full_name ?? user.email ?? "Unknown worker"
        );

        // Save to DB
        if (participantId) {
          await supabase.from("incident_reports").insert({
            organisation_id: profile.organisation_id,
            participant_id: participantId,
            reported_by: user.id,
            reporter_name: profile.full_name,
            report_data: result,
            severity: result.severity,
            is_reportable_to_ndis: result.isReportableToNDIS,
            status: "open",
          });
        }
        break;
      }

      case "handover_note": {
        if (!inputData?.notes) return NextResponse.json({ error: "Notes required" }, { status: 400 });
        result = await generateHandoverNote(
          inputData.notes,
          participant?.full_name ?? inputData?.participantName ?? "Participant"
        );
        break;
      }

      case "email": {
        if (!inputData?.context) return NextResponse.json({ error: "Email context required" }, { status: 400 });
        result = await generateEmail(inputData.context);
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown document type: ${type}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, result, type });

  } catch (error) {
    console.error("Generate document error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed. Check your API keys." },
      { status: 500 }
    );
  }
}

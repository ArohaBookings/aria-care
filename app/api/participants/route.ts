import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nextPaidPlan } from "@/lib/usage-limits";

type ParticipantFieldErrors = Record<string, string>;

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeOptionalDate(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function normalizePlanBudget(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function validateParticipantPayload(body: Record<string, unknown>) {
  const fieldErrors: ParticipantFieldErrors = {};
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const email = normalizeOptionalText(body.email);
  const planBudget = normalizePlanBudget(body.plan_budget);
  const planStartDate = normalizeOptionalDate(body.plan_start_date);
  const planEndDate = normalizeOptionalDate(body.plan_end_date);

  if (!fullName) {
    fieldErrors.full_name = "Enter the participant's full name.";
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Enter a valid email address, or leave this blank.";
  }

  if (Number.isNaN(planBudget) || (typeof planBudget === "number" && planBudget < 0)) {
    fieldErrors.plan_budget = "Plan budget must be a valid amount of 0 or more.";
  }

  if (planStartDate && planEndDate && String(planEndDate) < String(planStartDate)) {
    fieldErrors.plan_end_date = "Plan end date must be after the plan start date.";
  }

  return {
    fieldErrors,
    payload: {
      full_name: fullName,
      ndis_number: normalizeOptionalText(body.ndis_number),
      date_of_birth: normalizeOptionalDate(body.date_of_birth),
      email,
      phone: normalizeOptionalText(body.phone),
      address: normalizeOptionalText(body.address),
      support_category: typeof body.support_category === "string" && body.support_category ? body.support_category : "Daily Activities",
      plan_start_date: planStartDate,
      plan_end_date: planEndDate,
      plan_budget: Number.isNaN(planBudget) ? null : planBudget,
      primary_disability: normalizeOptionalText(body.primary_disability),
      emergency_contact_name: normalizeOptionalText(body.emergency_contact_name),
      emergency_contact_phone: normalizeOptionalText(body.emergency_contact_phone),
      notes: normalizeOptionalText(body.notes),
    },
  };
}

function explainParticipantInsertError(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string };
  const message = err?.message ?? "The participant could not be saved.";

  if (err?.code === "23502" && message.includes("full_name")) {
    return {
      error: "Full Name: Enter the participant's full name.",
      fieldErrors: { full_name: "Enter the participant's full name." },
    };
  }

  if (message.toLowerCase().includes("invalid input syntax") && message.toLowerCase().includes("date")) {
    return {
      error: "One of the date fields is not valid. Please check date of birth and plan dates.",
      fieldErrors: {
        date_of_birth: "Use a valid date or leave this blank.",
        plan_start_date: "Use a valid date or leave this blank.",
        plan_end_date: "Use a valid date or leave this blank.",
      },
    };
  }

  if (message.toLowerCase().includes("numeric")) {
    return {
      error: "Total Plan Budget: Enter a valid number, or leave this blank.",
      fieldErrors: { plan_budget: "Enter a valid number, or leave this blank." },
    };
  }

  return {
    error: `Participant could not be added: ${message}`,
    fieldErrors: {},
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("organisation_id").eq("id", user.id).single();
    const { data: participants, error } = await supabase
      .from("participants")
      .select("id, full_name, ndis_number, status, plan_end_date, support_category, funding_remaining_pct")
      .eq("organisation_id", profile?.organisation_id)
      .order("full_name");

    if (error) throw error;
    return NextResponse.json({ participants });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("organisation_id, role")
      .eq("id", user.id)
      .single();

    if (!["owner", "coordinator"].includes(profile?.role ?? "")) {
      return NextResponse.json({ error: "Only coordinators can add participants" }, { status: 403 });
    }

    // Check participant limit
    const { data: org } = await supabase.from("organisations").select("participant_limit, subscription_tier").eq("id", profile?.organisation_id).single();
    const { count } = await supabase.from("participants").select("*", { count: "exact", head: true }).eq("organisation_id", profile?.organisation_id).eq("status", "active");

    if ((count ?? 0) >= (org?.participant_limit ?? 10)) {
      const upgradePlan = nextPaidPlan(org?.subscription_tier);
      return NextResponse.json({
        error: `You've reached the participant limit for your ${org?.subscription_tier} plan. Upgrade to add more participants.`,
        code: "PARTICIPANT_LIMIT_REACHED",
        limit: org?.participant_limit ?? 10,
        upgradePlan,
        upgradeUrl: "/billing?reason=participant-limit",
      }, { status: 403 });
    }

    const body = await request.json();
    const { fieldErrors, payload } = validateParticipantPayload(body);
    if (Object.keys(fieldErrors).length) {
      return NextResponse.json({
        error: Object.values(fieldErrors)[0],
        fieldErrors,
      }, { status: 400 });
    }

    const { data: participant, error } = await supabase
      .from("participants")
      .insert({ ...payload, organisation_id: profile?.organisation_id, status: "active", funding_remaining_pct: 100 })
      .select("id")
      .single();

    if (error) {
      const explained = explainParticipantInsertError(error);
      return NextResponse.json(explained, { status: 400 });
    }
    return NextResponse.json({ success: true, participantId: participant.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({
      error: `Participant could not be added: ${message}`,
      fieldErrors: {},
    }, { status: 500 });
  }
}

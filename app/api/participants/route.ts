import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      return NextResponse.json({
        error: `You've reached the participant limit for your ${org?.subscription_tier} plan. Upgrade to add more participants.`
      }, { status: 403 });
    }

    const body = await request.json();
    const { data: participant, error } = await supabase
      .from("participants")
      .insert({ ...body, organisation_id: profile?.organisation_id, status: "active", funding_remaining_pct: 100 })
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, participantId: participant.id });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create participant" }, { status: 500 });
  }
}

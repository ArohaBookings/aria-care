import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface ImportRow {
  full_name?: string;
  ndis_number?: string;
  support_category?: string;
  primary_disability?: string;
  goals?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("organisation_id, account_type, organisations(product_mode, subscription_tier, participant_limit)")
      .eq("id", user.id)
      .single();

    const org = (Array.isArray(profile?.organisations) ? profile?.organisations[0] : profile?.organisations) as { product_mode?: string; subscription_tier?: string; participant_limit?: number } | undefined;
    const isSolo = profile?.account_type === "solo" || org?.product_mode === "solo" || (org?.subscription_tier?.startsWith("solo") ?? false);
    if (isSolo || !profile?.organisation_id) {
      return NextResponse.json({ error: "Participant import is available on provider/team accounts." }, { status: 403 });
    }

    const body = await request.json();
    const rows = Array.isArray(body.rows) ? (body.rows as ImportRow[]).slice(0, 500) : [];
    const clean = rows
      .map((r) => ({
        full_name: typeof r.full_name === "string" ? r.full_name.trim().slice(0, 200) : "",
        ndis_number: typeof r.ndis_number === "string" ? r.ndis_number.trim().slice(0, 40) : null,
        support_category: typeof r.support_category === "string" && r.support_category.trim() ? r.support_category.trim().slice(0, 80) : "Daily Activities",
        primary_disability: typeof r.primary_disability === "string" ? r.primary_disability.trim().slice(0, 120) || null : null,
        goals: typeof r.goals === "string" && r.goals.trim()
          ? r.goals.split(/[;|\n]/).map((g) => g.trim()).filter(Boolean).slice(0, 12)
          : null,
      }))
      .filter((r) => r.full_name.length > 0);

    if (clean.length === 0) {
      return NextResponse.json({ error: "No valid rows found. Each row needs at least a full name." }, { status: 400 });
    }

    // Respect the plan's participant limit.
    const limit = org?.participant_limit ?? 10;
    const { count: currentCount } = await supabase
      .from("participants")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", profile.organisation_id)
      .eq("status", "active");

    const available = Math.max(0, limit - (currentCount ?? 0));
    if (available === 0) {
      return NextResponse.json({ error: `You've reached your plan's participant limit (${limit}). Upgrade to add more.`, code: "PARTICIPANT_LIMIT" }, { status: 403 });
    }

    const toInsert = clean.slice(0, available).map((r) => ({
      organisation_id: profile.organisation_id,
      full_name: r.full_name,
      ndis_number: r.ndis_number,
      support_category: r.support_category,
      primary_disability: r.primary_disability,
      goals: r.goals,
      status: "active",
    }));

    const { data: inserted, error } = await supabase.from("participants").insert(toInsert).select("id");
    if (error) throw error;

    return NextResponse.json({
      created: inserted?.length ?? 0,
      skippedOverLimit: clean.length - toInsert.length,
      limit,
    });
  } catch (error) {
    console.error("[participants/import] error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed" }, { status: 500 });
  }
}

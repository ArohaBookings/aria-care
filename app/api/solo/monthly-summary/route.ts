import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMonthlySummary } from "@/lib/ai/generate";
import { rateLimit, rlKey } from "@/lib/security";

export const maxDuration = 60;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isSoloProfile(profile: any) {
  const rawOrg = profile?.organisations;
  const org = Array.isArray(rawOrg) ? rawOrg[0] : rawOrg;
  return profile?.account_type === "solo"
    || org?.product_mode === "solo"
    || (typeof org?.subscription_tier === "string" && org.subscription_tier.startsWith("solo"));
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("account_type, organisations(subscription_tier, product_mode)")
      .eq("id", user.id)
      .single();

    if (!profile || !isSoloProfile(profile)) {
      return NextResponse.json({ error: "Solo mode is not enabled for this account" }, { status: 403 });
    }

    const rl = rateLimit(rlKey(user.id, "monthly-summary"), 10);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "You've generated several monthly summaries recently. Please try again a little later." },
        { status: 429 }
      );
    }

    // Optional ?offset=1 looks at last month; default current month.
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const offset = Number.isInteger(body?.monthOffset) ? Math.max(0, Math.min(11, body.monthOffset as number)) : 0;

    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset + 1, 1));

    const { data: notes, error } = await supabase
      .from("solo_notes")
      .select("note_type, draft_text, created_at")
      .eq("user_id", user.id)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: true })
      .limit(120);

    if (error) throw error;

    const monthLabel = start.toLocaleString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" });

    if (!notes || notes.length < 2) {
      return NextResponse.json(
        { error: `Add at least two notes in ${monthLabel} before generating a monthly summary.` },
        { status: 400 }
      );
    }

    const summary = await generateMonthlySummary({
      month: monthLabel,
      notes: notes.map((note) => ({
        noteType: note.note_type,
        text: (note.draft_text || "").slice(0, 4000),
        date: (note.created_at || "").slice(0, 10),
      })),
    });

    return NextResponse.json({ summary, month: monthLabel });
  } catch (error) {
    console.error("[solo/monthly-summary] error:", error);
    return NextResponse.json(
      { error: "Could not generate the monthly summary. Please retry." },
      { status: 500 }
    );
  }
}

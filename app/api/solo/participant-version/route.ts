import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateParticipantVersion } from "@/lib/ai/generate";
import { rateLimit, rlKey, sanitizeUserInput } from "@/lib/security";

export const maxDuration = 60;

function isSoloProfile(profile: { account_type?: string | null; organisations?: unknown }) {
  const rawOrg = (profile as { organisations?: unknown }).organisations;
  const org = (Array.isArray(rawOrg) ? rawOrg[0] : rawOrg) as { product_mode?: string | null; subscription_tier?: string | null } | null;
  return profile?.account_type === "solo"
    || org?.product_mode === "solo"
    || (typeof org?.subscription_tier === "string" && org.subscription_tier.startsWith("solo"));
}

const ALLOWED_MODES = new Set(["translate", "easy_read"]);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("account_type, organisations(product_mode, subscription_tier)")
      .eq("id", user.id)
      .single();
    if (!profile || !isSoloProfile(profile)) {
      return NextResponse.json({ error: "Solo mode is not enabled for this account" }, { status: 403 });
    }

    const rl = rateLimit(rlKey(user.id, "participant-version"), 40);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many accessible versions this hour. Please try again shortly." }, { status: 429 });
    }

    const body = await request.json();
    const mode = typeof body.mode === "string" && ALLOWED_MODES.has(body.mode) ? body.mode as "translate" | "easy_read" : "translate";
    const language = typeof body.language === "string" ? body.language.slice(0, 40) : "English";
    const rawText = typeof body.text === "string" ? body.text : "";
    if (rawText.trim().length < 10) {
      return NextResponse.json({ error: "Add a participant-friendly summary first." }, { status: 400 });
    }

    const { text: safeText } = sanitizeUserInput(rawText.slice(0, 6000));
    const result = await generateParticipantVersion({ text: safeText, mode, language });
    if (!result.text) {
      return NextResponse.json({ error: "Could not create the accessible version. Please retry." }, { status: 502 });
    }
    return NextResponse.json({ text: result.text, mode, language });
  } catch (error) {
    console.error("[solo/participant-version] error:", error);
    return NextResponse.json({ error: "Could not create the accessible version. Please retry." }, { status: 500 });
  }
}

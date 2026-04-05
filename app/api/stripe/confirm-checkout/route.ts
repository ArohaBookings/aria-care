import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

// Called by /billing/success on page load. Syncs the subscription state
// from Stripe directly so the user can access the dashboard immediately,
// without waiting for the webhook to land. The webhook will re-apply the
// same state idempotently.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

const PARTICIPANT_LIMITS: Record<string, number> = {
  starter: 10, growth: 30, business: 75,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await request.json();
    if (!sessionId) return NextResponse.json({ error: "session_id required" }, { status: 400 });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orgId = session.metadata?.organisation_id;
    const plan = session.metadata?.plan ?? "starter";

    if (!orgId) return NextResponse.json({ error: "No organisation metadata" }, { status: 400 });

    // Confirm this user belongs to the org (prevents session-id abuse).
    const { data: profile } = await supabase
      .from("users")
      .select("organisation_id")
      .eq("id", user.id)
      .single();
    if (profile?.organisation_id !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    let status = "active";
    let trialEndsAt: string | null = null;
    if (subId) {
      const sub = await stripe.subscriptions.retrieve(subId);
      status = sub.status;
      trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
    }

    await supabase
      .from("organisations")
      .update({
        subscription_status: status,
        subscription_tier: plan,
        stripe_subscription_id: subId ?? null,
        participant_limit: PARTICIPANT_LIMITS[plan] ?? 10,
        ...(trialEndsAt ? { trial_ends_at: trialEndsAt } : {}),
      })
      .eq("id", orgId);

    return NextResponse.json({ ok: true, plan, status });
  } catch (err) {
    console.error("[confirm-checkout] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to confirm" },
      { status: 500 }
    );
  }
}

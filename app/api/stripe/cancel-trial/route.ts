import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

// Immediately cancels an organisation's Stripe subscription (trial or paid).
// Owners and coordinators only. The webhook handles DB state via
// customer.subscription.deleted so this route only needs to call Stripe.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("organisation_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.organisation_id) {
      return NextResponse.json({ error: "No organisation" }, { status: 400 });
    }
    if (!["owner", "coordinator"].includes(profile.role ?? "")) {
      return NextResponse.json({ error: "Only owners and coordinators can cancel the subscription." }, { status: 403 });
    }

    const { data: org } = await supabase
      .from("organisations")
      .select("stripe_subscription_id, subscription_status")
      .eq("id", profile.organisation_id)
      .single();

    if (!org?.stripe_subscription_id) {
      return NextResponse.json({ error: "No active subscription to cancel." }, { status: 400 });
    }

    await stripe.subscriptions.cancel(org.stripe_subscription_id);

    // Mark cancelled immediately so the UI reflects it even before the
    // webhook lands. The webhook will re-apply the same state idempotently.
    await supabase
      .from("organisations")
      .update({
        subscription_status: "cancelled",
        subscription_tier: "trial",
        participant_limit: 10,
        stripe_subscription_id: null,
      })
      .eq("id", profile.organisation_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cancel-trial] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}

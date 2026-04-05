import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

const PRICE_IDS: Record<string, string> = {
  starter:  process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID!,
  growth:   process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID!,
  business: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID!,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("organisation_id, full_name")
      .eq("id", user.id)
      .single();

    const { data: org } = await supabase
      .from("organisations")
      .select("stripe_customer_id, name")
      .eq("id", profile?.organisation_id)
      .single();

    const { plan } = await request.json();
    const priceId = PRICE_IDS[plan];
    if (!priceId) return NextResponse.json({ error: `Invalid plan: ${plan}` }, { status: 400 });

    // Get or create Stripe customer
    let customerId = org?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org?.name ?? profile?.full_name ?? undefined,
        metadata: {
          supabase_user_id: user.id,
          organisation_id: profile?.organisation_id ?? "",
        },
      });
      customerId = customer.id;
      await supabase
        .from("organisations")
        .update({ stripe_customer_id: customerId })
        .eq("id", profile?.organisation_id);
    }

    // Only grant a trial once per organisation. If this org has already
    // had a subscription attached (even a cancelled trial), skip trial_period_days
    // so we don't give unlimited trial loops.
    const hadSub = !!org?.stripe_customer_id && (
      (await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 1 })).data.length > 0
    );

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?plan=${encodeURIComponent(plan)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
      allow_promotion_codes: true,
      // Require card upfront even during trial — no anonymous trials.
      payment_method_collection: "always",
      metadata: { organisation_id: profile?.organisation_id ?? "", plan, user_id: user.id },
      subscription_data: {
        ...(hadSub ? {} : { trial_period_days: 14 }),
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
        metadata: { organisation_id: profile?.organisation_id ?? "", plan },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}

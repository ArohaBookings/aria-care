import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/app-url";
import { isSoloPlan } from "@/lib/usage-limits";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

function env(name: string) {
  return process.env[name] ?? "";
}

function getPriceId(plan: string, country?: string | null) {
  const currency = country === "NZ" || country === "New Zealand" ? "NZD" : "AUD";
  const priceIds: Record<string, string> = {
    starter: env("NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID"),
    growth: env("NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID"),
    business: env("NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID"),
    solo: currency === "NZD"
      ? env("NEXT_PUBLIC_STRIPE_SOLO_NZD_PRICE_ID") || env("STRIPE_SOLO_NZD_PRICE_ID")
      : env("NEXT_PUBLIC_STRIPE_SOLO_AUD_PRICE_ID") || env("STRIPE_SOLO_AUD_PRICE_ID"),
    solo_pro: currency === "NZD"
      ? env("NEXT_PUBLIC_STRIPE_SOLO_PRO_NZD_PRICE_ID") || env("STRIPE_SOLO_PRO_NZD_PRICE_ID")
      : env("NEXT_PUBLIC_STRIPE_SOLO_PRO_AUD_PRICE_ID") || env("STRIPE_SOLO_PRO_AUD_PRICE_ID"),
  };
  return priceIds[plan];
}

export async function POST(request: NextRequest) {
  try {
    const appUrl = getAppUrl(request);
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
      .select("stripe_customer_id, name, billing_country, product_mode")
      .eq("id", profile?.organisation_id)
      .single();

    const { plan, country } = await request.json();
    if (plan === "solo_free") {
      return NextResponse.json({ error: "Free Solo does not require Stripe checkout" }, { status: 400 });
    }
    const checkoutCountry = country ?? org?.billing_country ?? "AU";
    const priceId = getPriceId(plan, checkoutCountry);
    if (!priceId) return NextResponse.json({ error: `Invalid plan: ${plan}` }, { status: 400 });
    const productMode = isSoloPlan(plan) ? "solo" : "provider";

    // Get or create Stripe customer
    let customerId = org?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org?.name ?? profile?.full_name ?? undefined,
        metadata: {
          supabase_user_id: user.id,
          organisation_id: profile?.organisation_id ?? "",
          product_mode: productMode,
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
      success_url: `${appUrl}/billing/success?plan=${encodeURIComponent(plan)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing`,
      allow_promotion_codes: true,
      // Require card upfront even during trial — no anonymous trials.
      payment_method_collection: "always",
      metadata: { organisation_id: profile?.organisation_id ?? "", plan, user_id: user.id, product_mode: productMode },
      subscription_data: {
        ...(hadSub ? {} : { trial_period_days: 14 }),
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
        metadata: { organisation_id: profile?.organisation_id ?? "", plan, product_mode: productMode },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}

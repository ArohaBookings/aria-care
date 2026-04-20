import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

// Admin client bypasses RLS — safe here because this is server-only webhook
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const PARTICIPANT_LIMITS: Record<string, number> = {
  starter: 10, growth: 30, business: 75,
};

// Price → plan map is built inside the handler (not at module load time) so
// env vars are guaranteed to be populated by the runtime. Building it at
// module scope caused stale/empty keys on certain edge runtimes.
function buildPlanFromPrice(): Record<string, string> {
  const map: Record<string, string> = {};
  const starter = process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID;
  const growth = process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID;
  const business = process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID;
  if (starter) map[starter] = "starter";
  if (growth) map[growth] = "growth";
  if (business) map[business] = "business";
  return map;
}

async function updateOrg(organisationId: string, updates: Record<string, unknown>) {
  const { error } = await admin.from("organisations").update(updates).eq("id", organisationId);
  if (error) {
    throw new Error(`Failed to update organisation ${organisationId}: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organisation_id;
        const plan = session.metadata?.plan ?? "starter";
        if (!orgId) {
          console.warn(`[webhook] checkout.session.completed missing organisation_id event=${event.id}`);
          break;
        }

        // Fetch the full subscription so we can reflect trial state precisely.
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        let status: string = "active";
        let trialEndsAt: string | null = null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          status = sub.status; // "trialing" | "active" | ...
          trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
        }

        await updateOrg(orgId, {
          subscription_status: status,
          // Give feature access during trial too — plan is already chosen.
          subscription_tier: plan,
          stripe_subscription_id: subId ?? null,
          participant_limit: PARTICIPANT_LIMITS[plan] ?? 10,
          ...(trialEndsAt ? { trial_ends_at: trialEndsAt } : {}),
        });
        console.log(`✓ Checkout complete: org=${orgId} plan=${plan} status=${status}`);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.organisation_id;
        if (!orgId) {
          console.warn(`[webhook] ${event.type} missing organisation_id sub=${sub.id}`);
          break;
        }
        const priceId = sub.items.data[0]?.price?.id ?? "";
        const planFromPrice = buildPlanFromPrice();
        const plan = planFromPrice[priceId] ?? "starter";
        const trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
        const activeLike = sub.status === "active" || sub.status === "trialing";
        await updateOrg(orgId, {
          subscription_status: sub.status,
          subscription_tier: activeLike ? plan : "trial",
          stripe_subscription_id: sub.id,
          participant_limit: activeLike ? (PARTICIPANT_LIMITS[plan] ?? 10) : 10,
          ...(trialEndsAt ? { trial_ends_at: trialEndsAt } : {}),
        });
        break;
      }

      case "customer.subscription.trial_will_end": {
        // Stripe fires this ~3 days before trial ends. We use our own cron
        // for the day-10 nudge but also log this for visibility.
        const sub = event.data.object as Stripe.Subscription;
        console.log(`[webhook] trial_will_end sub=${sub.id} ends_at=${sub.trial_end}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.organisation_id;
        if (!orgId) {
          console.warn(`[webhook] customer.subscription.deleted missing organisation_id sub=${sub.id}`);
          break;
        }
        await updateOrg(orgId, {
          subscription_status: "cancelled",
          subscription_tier: "trial",
          participant_limit: 10,
          stripe_subscription_id: null,
        });
        console.log(`✓ Subscription cancelled: org=${orgId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const { data: org } = await admin
          .from("organisations")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();
        if (org) {
          await updateOrg(org.id, { subscription_status: "past_due" });
        }
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const { data: org } = await admin
          .from("organisations")
          .select("id, subscription_tier")
          .eq("stripe_customer_id", customerId)
          .single();
        if (org && org.subscription_tier !== "trial") {
          await updateOrg(org.id, { subscription_status: "active" });
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

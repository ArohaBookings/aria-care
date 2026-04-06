import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTrialExpiryReminder } from "@/lib/email/send";

// Daily cron: send personalised trial reminder emails.
//
// We send at 3 key moments in a 14-day trial:
//   • Day 10 (4 days remaining) — the big conversion nudge
//   • Day 13 (1 day remaining)  — the last chance
//   • Day 14 (0 days / expired) — transitional "trial ended" email
//
// Dedupe is handled by the email_log table: if we've already sent the
// same subject to the same organisation in the last 20 hours, we skip.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Grab every org currently on a trial (either Stripe trialing status OR
  // the legacy free trial_tier with no Stripe subscription yet).
  const now = new Date();
  const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  const { data: orgs, error } = await admin
    .from("organisations")
    .select("id, name, contact_email, trial_ends_at, subscription_status, subscription_tier")
    .or("subscription_status.eq.trialing,subscription_tier.eq.trial")
    .gte("trial_ends_at", oneDayAgo.toISOString())
    .lte("trial_ends_at", in5Days.toISOString());

  if (error) {
    console.error("[cron/trial-expiry] fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ org: string; daysRemaining: number; sent: boolean; reason?: string }> = [];

  for (const org of orgs ?? []) {
    if (!org.contact_email || !org.trial_ends_at) {
      results.push({ org: org.id, daysRemaining: -999, sent: false, reason: "no-email-or-trial-end" });
      continue;
    }

    const daysRemaining = Math.ceil(
      (new Date(org.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Only trigger at defined checkpoints — 4, 1, and 0 days remaining.
    if (![4, 1, 0].includes(daysRemaining)) {
      continue;
    }

    // Look up participant count for personalisation (day 10 especially).
    const { count: participantCount } = await admin
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", org.id)
      .eq("status", "active");

    const subject =
      daysRemaining <= 0
        ? "Your Aria trial has ended"
        : `Your Aria trial ends in ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"}`;

    // Dedupe
    const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
    const { data: sentRecently } = await admin
      .from("email_log")
      .select("id")
      .eq("organisation_id", org.id)
      .eq("subject", subject)
      .eq("status", "sent")
      .gte("created_at", cutoff)
      .limit(1);

    if ((sentRecently?.length ?? 0) > 0) {
      results.push({ org: org.id, daysRemaining, sent: false, reason: "already-sent-today" });
      continue;
    }

    const result = await sendTrialExpiryReminder({
      to: org.contact_email,
      organisationId: org.id,
      organisationName: org.name || "your organisation",
      daysRemaining,
      participantCount: participantCount ?? 0,
      trialEndsAt: org.trial_ends_at,
    });

    results.push({ org: org.id, daysRemaining, sent: result.ok, reason: result.error });
  }

  const sent = results.filter((r) => r.sent).length;
  return NextResponse.json({
    ok: true,
    emailsSent: sent,
    orgsChecked: orgs?.length ?? 0,
    details: results,
  });
}

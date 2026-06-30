import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { sendNoFirstNoteEmail, sendPaidInactiveCheckInEmail } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LifecycleUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  organisation_id: string | null;
  created_at: string;
  organisations: {
    id: string;
    subscription_tier: string | null;
    product_mode: string | null;
    contact_email: string | null;
  } | Array<{
    id: string;
    subscription_tier: string | null;
    product_mode: string | null;
    contact_email: string | null;
  }> | null;
};

async function wasSentRecently(admin: any, args: { userId: string; recipient: string; emailType: string; hours: number }) {
  const cutoff = new Date(Date.now() - args.hours * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("email_log")
    .select("id")
    .eq("user_id", args.userId)
    .eq("email_type", args.emailType)
    .eq("status", "sent")
    .gte("sent_at", cutoff)
    .limit(1);

  if (!error) return (data?.length ?? 0) > 0;

  const { data: fallbackData } = await admin
    .from("email_log")
    .select("id")
    .eq("recipient_email", args.recipient)
    .eq("email_type", args.emailType)
    .eq("status", "sent")
    .gte("sent_at", cutoff)
    .limit(1);

  return (fallbackData?.length ?? 0) > 0;
}

async function soloNoteCount(admin: any, userId: string) {
  const { count } = await admin
    .from("solo_notes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const now = Date.now();
  const olderThan24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const olderThan48h = new Date(now - 48 * 60 * 60 * 1000).toISOString();
  const notOlderThan7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: users, error } = await admin
    .from("users")
    .select("id, email, full_name, organisation_id, created_at, organisations(id, subscription_tier, product_mode, contact_email)")
    .eq("account_type", "solo")
    .gte("created_at", notOlderThan7d)
    .lte("created_at", olderThan24h)
    .limit(200);

  if (error) {
    console.error("[cron/lifecycle-emails] fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ user: string; emailType: string; sent: boolean; reason?: string }> = [];

  for (const user of (users ?? []) as unknown as LifecycleUser[]) {
    const org = Array.isArray(user.organisations) ? user.organisations[0] : user.organisations;
    const recipient = user.email || org?.contact_email;
    if (!recipient || !user.organisation_id) {
      results.push({ user: user.id, emailType: "lifecycle", sent: false, reason: "missing-recipient-or-org" });
      continue;
    }

    const notes = await soloNoteCount(admin, user.id);
    const plan = org?.subscription_tier ?? "solo_free";
    const isPaid = plan === "solo" || plan === "solo_pro";

    if (notes === 0) {
      const alreadySentNoFirstNote = await wasSentRecently(admin, {
        userId: user.id,
        recipient,
        emailType: "no_first_note_24h",
        hours: 24 * 14,
      });
      if (!alreadySentNoFirstNote) {
        const result = await sendNoFirstNoteEmail({
          to: recipient,
          organisationId: user.organisation_id,
          fullName: user.full_name || "there",
          userId: user.id,
        });
        results.push({ user: user.id, emailType: "no_first_note_24h", sent: result.ok, reason: result.error });
      }

      if (isPaid && user.created_at <= olderThan48h) {
        const alreadySentPaidInactive = await wasSentRecently(admin, {
          userId: user.id,
          recipient,
          emailType: "paid_inactive_48h",
          hours: 24 * 14,
        });
        if (!alreadySentPaidInactive) {
          const result = await sendPaidInactiveCheckInEmail({
            to: recipient,
            organisationId: user.organisation_id,
            fullName: user.full_name || "there",
            userId: user.id,
          });
          results.push({ user: user.id, emailType: "paid_inactive_48h", sent: result.ok, reason: result.error });
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    usersChecked: users?.length ?? 0,
    emailsSent: results.filter((result) => result.sent).length,
    details: results,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendComplianceReminder } from "@/lib/email/send";

// Daily cron: refresh compliance statuses and email owners about
// items expiring within 30 days (or already expired).
//
// Secured via the `CRON_SECRET` header. Vercel's scheduled crons
// automatically include `Authorization: Bearer <CRON_SECRET>` when
// the value is set in the project's env vars.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return unauthorized();

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 1. Refresh statuses
  const { data: updated, error: updateErr } = await admin.rpc("update_compliance_status");
  if (updateErr) {
    console.error("[cron/compliance] update error:", updateErr);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // 2. Find items expiring within 30 days (or already expired)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 30);

  const { data: items, error: fetchErr } = await admin
    .from("staff_compliance")
    .select("id, organisation_id, item_label, expiry_date, user_id, users(full_name, email), organisations(contact_email, name)")
    .lte("expiry_date", cutoff.toISOString().slice(0, 10));

  if (fetchErr) {
    console.error("[cron/compliance] fetch error:", fetchErr);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  let emailed = 0;
  // Supabase returns joined single-row FK relations typed as arrays of one.
  // Normalise to optional single objects for ergonomic access.
  type RawRow = {
    id: string;
    organisation_id: string;
    item_label: string;
    expiry_date: string | null;
    users: { full_name: string | null; email: string | null }[] | null;
    organisations: { contact_email: string | null; name: string | null }[] | null;
  };

  for (const raw of (items ?? []) as unknown as RawRow[]) {
    const row = {
      ...raw,
      users: Array.isArray(raw.users) ? raw.users[0] ?? null : raw.users,
      organisations: Array.isArray(raw.organisations) ? raw.organisations[0] ?? null : raw.organisations,
    };
    const orgEmail = row.organisations?.contact_email;
    if (!orgEmail || !row.expiry_date) continue;

    const daysRemaining = Math.ceil(
      (new Date(row.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const result = await sendComplianceReminder({
      to: orgEmail,
      organisationId: row.organisation_id,
      staffName: row.users?.full_name || row.users?.email || "staff member",
      itemLabel: row.item_label,
      expiryDate: row.expiry_date,
      daysRemaining,
    });
    if (result.ok) emailed += 1;
  }

  return NextResponse.json({
    ok: true,
    statusesUpdated: updated,
    emailsSent: emailed,
    itemsChecked: items?.length ?? 0,
  });
}

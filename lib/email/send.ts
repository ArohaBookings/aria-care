// ============================================================
// Aria — transactional email via Resend
//
// All functions are safe to call even if RESEND_API_KEY is not
// set: they will log a warning and no-op rather than crashing
// the server. This is important because the cron routes call
// them and we never want a missing env var to bring down the
// dashboard in production.
// ============================================================

import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Aria <noreply@aria.care>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://aria.care";

const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

// Server-only admin client used to log emails. Never ship to the browser.
function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

type EmailType =
  | "compliance_reminder"
  | "trial_expiry"
  | "welcome"
  | "signup_confirmation"
  | "note_approved"
  | "generic";

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  type: EmailType;
  organisationId?: string | null;
};

async function logEmail(args: SendArgs, status: "sent" | "failed", resendId: string | null, error: string | null) {
  try {
    await adminSupabase().from("email_log").insert({
      organisation_id: args.organisationId ?? null,
      recipient_email: args.to,
      subject: args.subject,
      email_type: args.type,
      status,
      resend_id: resendId,
      error,
    });
  } catch (err) {
    // Logging must never break the caller.
    console.error("[email] failed to log email:", err);
  }
}

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing — skipping send:", args.subject);
    await logEmail(args, "failed", null, "RESEND_API_KEY not configured");
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: args.to,
      subject: args.subject,
      html: args.html,
    });

    if (error) {
      console.error("[email] resend error:", error);
      await logEmail(args, "failed", null, error.message);
      return { ok: false, error: error.message };
    }

    await logEmail(args, "sent", data?.id ?? null, null);
    return { ok: true, id: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] send threw:", msg);
    await logEmail(args, "failed", null, msg);
    return { ok: false, error: msg };
  }
}

// ------------------------------------------------------------
// Shared HTML shell — keeps every email visually consistent
// without pulling in a template engine.
// ------------------------------------------------------------
function shell(heading: string, bodyHtml: string, ctaLabel?: string, ctaUrl?: string) {
  const cta = ctaLabel && ctaUrl
    ? `<p style="margin:32px 0 0"><a href="${ctaUrl}" style="background:#0f172a;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${ctaLabel}</a></p>`
    : "";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;line-height:1.6">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px">
      <div style="background:#fff;border-radius:16px;padding:40px;border:1px solid #e2e8f0">
        <div style="font-size:24px;font-weight:700;color:#0f172a;margin-bottom:8px">Aria</div>
        <div style="height:1px;background:#e2e8f0;margin:20px 0"></div>
        <h1 style="font-size:22px;font-weight:700;margin:0 0 16px">${heading}</h1>
        ${bodyHtml}
        ${cta}
      </div>
      <div style="text-align:center;padding:24px;font-size:12px;color:#64748b">
        Aria — AI operating system for NDIS providers. <br/>
        <a href="${APP_URL}" style="color:#64748b">${APP_URL.replace(/^https?:\/\//, "")}</a>
      </div>
    </div>
  </body>
</html>`;
}

// ------------------------------------------------------------
// Templates
// ------------------------------------------------------------

export async function sendComplianceReminder(args: {
  to: string;
  organisationId: string;
  staffName: string;
  itemLabel: string;
  expiryDate: string;
  daysRemaining: number;
}) {
  const urgency = args.daysRemaining < 0
    ? `<strong style="color:#dc2626">expired ${Math.abs(args.daysRemaining)} days ago</strong>`
    : args.daysRemaining === 0
    ? `<strong style="color:#dc2626">expires today</strong>`
    : `expires in <strong>${args.daysRemaining} days</strong>`;

  return sendEmail({
    to: args.to,
    type: "compliance_reminder",
    organisationId: args.organisationId,
    subject: `Compliance reminder: ${args.itemLabel} for ${args.staffName}`,
    html: shell(
      "Compliance item needs attention",
      `<p><strong>${args.staffName}</strong>'s <strong>${args.itemLabel}</strong> ${urgency} (${args.expiryDate}).</p>
       <p>You can renew this from your Aria compliance dashboard to keep your team audit-ready.</p>`,
      "Open compliance dashboard",
      `${APP_URL}/compliance`
    ),
  });
}

export async function sendTrialExpiryReminder(args: {
  to: string;
  organisationId: string;
  organisationName: string;
  daysRemaining: number;
  participantCount?: number;
  trialEndsAt?: string;
}) {
  const ended = args.daysRemaining <= 0;
  const subject = ended
    ? "Your Aria trial has ended"
    : `Your Aria trial ends in ${args.daysRemaining} ${args.daysRemaining === 1 ? "day" : "days"}`;

  // Warm, specific day-10 conversion email (4 days remaining).
  const heading = ended
    ? "Your trial has ended"
    : args.daysRemaining === 1
    ? "Only one day left on your trial"
    : `${args.daysRemaining} days left on your Aria trial`;

  const endDate = args.trialEndsAt
    ? new Date(args.trialEndsAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const participantLine =
    typeof args.participantCount === "number" && args.participantCount > 0
      ? `<p>You've added <strong>${args.participantCount} participant${args.participantCount === 1 ? "" : "s"}</strong> to ${args.organisationName} so far — that's real data your team is already working with every day.</p>`
      : `<p>Your Aria workspace is ready — load your participants and try voice notes today to see the full impact.</p>`;

  const body = ended
    ? `<p>Hi ${args.organisationName},</p>
       <p>Your 14-day free trial has ended. Your data is safe and waiting — add a payment method to keep your team running without interruption.</p>
       ${participantLine}
       <p style="color:#64748b;font-size:14px">Plans start at <strong>$149/month</strong>. You can cancel anytime from Settings → Billing.</p>`
    : `<p>Hi ${args.organisationName},</p>
       <p>Your Aria trial ${args.daysRemaining === 1 ? "ends <strong>tomorrow</strong>" : `ends in <strong>${args.daysRemaining} days</strong>`}${endDate ? ` on <strong>${endDate}</strong>` : ""}.</p>
       ${participantLine}
       <p>Here's what your team keeps on a paid plan:</p>
       <ul>
         <li>Voice-to-note — turn 45-minute progress notes into 90-second voice memos</li>
         <li>NDIS-compliant compliance dashboard with staff expiry tracking</li>
         <li>AI document suite — support plans, incident reports, handover notes</li>
         <li>Unlimited team members on Growth and above</li>
       </ul>
       <p style="color:#64748b;font-size:14px">Plans start at <strong>$149/month</strong>. Cancel anytime — no questions asked.</p>`;

  return sendEmail({
    to: args.to,
    type: "trial_expiry",
    organisationId: args.organisationId,
    subject,
    html: shell(heading, body, ended ? "Restart your subscription" : "Keep my workspace", `${APP_URL}/billing`),
  });
}

export async function sendWelcomeEmail(args: {
  to: string;
  organisationId: string;
  fullName: string;
}) {
  return sendEmail({
    to: args.to,
    type: "welcome",
    organisationId: args.organisationId,
    subject: "Welcome to Aria",
    html: shell(
      `Welcome, ${args.fullName.split(" ")[0]}`,
      `<p>Your Aria workspace is ready. A few quick things to try first:</p>
       <ul>
         <li>Add your first participant</li>
         <li>Record a voice progress note — it's the fastest way to see Aria in action</li>
         <li>Invite your team from the Staff page</li>
       </ul>
       <p>If you have any questions, just reply to this email.</p>`,
      "Open Aria",
      `${APP_URL}/dashboard`
    ),
  });
}

export async function sendSignupConfirmationEmail(args: {
  to: string;
  fullName: string;
  organisationName: string;
  actionLink: string;
}) {
  return sendEmail({
    to: args.to,
    type: "signup_confirmation",
    subject: "Confirm your Aria signup",
    html: shell(
      `Welcome to Aria, ${args.fullName.split(" ")[0]}`,
      `<p>Your workspace for <strong>${args.organisationName}</strong> is almost ready.</p>
       <p>Click the button below to confirm your email, activate your account, and continue into onboarding and Stripe checkout for your 14-day free trial.</p>
       <p style="color:#64748b;font-size:14px">Card details are collected at checkout to start the trial, but you won't be charged until the trial ends.</p>`,
      "Confirm my email",
      args.actionLink
    ),
  });
}

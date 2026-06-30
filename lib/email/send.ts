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
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Leo from Aria Care <support@ariacare.app>";
const REPLY_TO_EMAIL = process.env.RESEND_REPLY_TO_EMAIL || process.env.SUPPORT_EMAIL || "support@ariacare.app";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ariacare.app";

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
  | "no_first_note_24h"
  | "first_note_created"
  | "free_usage_nearing_limit"
  | "free_limit_reached"
  | "paid_inactive_48h"
  | "generic";

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  type: EmailType;
  organisationId?: string | null;
  userId?: string | null;
  relatedNoteId?: string | null;
  unsubscribed?: boolean;
  replyTo?: string;
};

async function logEmail(args: SendArgs, status: "sent" | "failed", resendId: string | null, error: string | null) {
  try {
    const payload = {
      organisation_id: args.organisationId ?? null,
      user_id: args.userId ?? null,
      recipient_email: args.to,
      recipient: args.to,
      subject: args.subject,
      email_type: args.type,
      status,
      resend_id: resendId,
      error,
      related_note_id: args.relatedNoteId ?? null,
      unsubscribed: args.unsubscribed ?? false,
    };
    const { error: insertError } = await adminSupabase().from("email_log").insert(payload);

    if (insertError) {
      await adminSupabase().from("email_log").insert({
        organisation_id: args.organisationId ?? null,
        recipient_email: args.to,
        subject: args.subject,
        email_type: args.type,
        status,
        resend_id: resendId,
        error: error ? `${error} | tracking fallback: ${insertError.message}` : `tracking fallback: ${insertError.message}`,
      });
    }
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
      reply_to: args.replyTo || REPLY_TO_EMAIL,
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
        <div style="font-size:24px;font-weight:700;color:#0f172a;margin-bottom:8px">Aria Care</div>
        <div style="height:1px;background:#e2e8f0;margin:20px 0"></div>
        <h1 style="font-size:22px;font-weight:700;margin:0 0 16px">${heading}</h1>
        ${bodyHtml}
        ${cta}
      </div>
      <div style="text-align:center;padding:24px;font-size:12px;color:#64748b">
        Aria Care — structured support note drafts for Australia & NZ. <br/>
        Reply to this email for help. <br/>
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
       <p>You can renew this from your Aria compliance dashboard so your team has clearer expiry visibility.</p>`,
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
         <li>Compliance dashboard with staff expiry tracking</li>
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
  userId?: string | null;
}) {
  return sendEmail({
    to: args.to,
    type: "welcome",
    organisationId: args.organisationId,
    userId: args.userId,
    subject: "Welcome to Aria Care",
    html: shell(
      `Welcome to Aria Care, ${args.fullName.split(" ")[0]}`,
      `<p>Your Aria Care workspace is ready. The fastest way to test it is simple:</p>
       <p><strong>Record a quick voice note or type a few bullet points from a real shift.</strong></p>
       <ul>
         <li>Use initials or a nickname where possible.</li>
         <li>Include the shift time, support provided, presentation/mood, risks and handover if relevant.</li>
         <li>Review and edit the draft before pasting it into ShiftCare, Lumary, Brevity or your workplace system.</li>
       </ul>
       <p>If you have any questions, just reply to this email.</p>`,
      "Create your first note",
      `${APP_URL}/notes?mode=text`
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
       <p>Click the button below to confirm your email, activate your account, and continue into onboarding.</p>
       <p style="color:#64748b;font-size:14px">Free Solo does not need a card. Paid Solo and Provider trials collect card details at Stripe checkout before the 14-day trial starts.</p>`,
      "Confirm my email",
      args.actionLink
    ),
  });
}

export async function sendNoFirstNoteEmail(args: {
  to: string;
  organisationId: string;
  fullName: string;
  userId: string;
}) {
  return sendEmail({
    to: args.to,
    type: "no_first_note_24h",
    organisationId: args.organisationId,
    userId: args.userId,
    subject: "Try one real shift note",
    html: shell(
      "The easiest way to test Aria Care is with one real shift note",
      `<p>Hi ${args.fullName.split(" ")[0]},</p>
       <p>The easiest way to test Aria Care is with one real shift note.</p>
       <p>You can paste something rough like:</p>
       <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin:18px 0;color:#334155;font-size:14px">
         J 2-5 grocery shopping. Calm on arrival. Needed prompting at checkout. No incidents. Tired near end. Handover: encourage hydration next shift.
       </div>
       <p>Aria will turn that into a structured draft you can review, edit and paste into your workplace system.</p>`,
      "Create a test note",
      `${APP_URL}/notes?mode=text`
    ),
  });
}

export async function sendFirstNoteCreatedEmail(args: {
  to: string;
  organisationId: string;
  fullName: string;
  userId: string;
  noteId: string;
}) {
  const feedbackSubject = encodeURIComponent("Aria Care note feedback");
  const feedbackBody = encodeURIComponent(`Was the note usable enough to paste into your workplace system?\n\nNote ID: ${args.noteId}\n\nMy answer: `);

  return sendEmail({
    to: args.to,
    type: "first_note_created",
    organisationId: args.organisationId,
    userId: args.userId,
    relatedNoteId: args.noteId,
    subject: "Was your first Aria Care note useful?",
    html: shell(
      "Was the note usable enough to paste into your workplace system?",
      `<p>Hi ${args.fullName.split(" ")[0]},</p>
       <p>Nice, you created your first Aria Care draft. Quick question:</p>
       <p><strong>Was the note usable enough to paste into your workplace system?</strong></p>
       <p style="margin:24px 0">
         <a href="mailto:${REPLY_TO_EMAIL}?subject=${feedbackSubject}&body=${feedbackBody}Useful" style="background:#0f766e;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;margin:0 6px 8px 0">Useful</a>
         <a href="mailto:${REPLY_TO_EMAIL}?subject=${feedbackSubject}&body=${feedbackBody}Sort of" style="background:#334155;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;margin:0 6px 8px 0">Sort of</a>
         <a href="mailto:${REPLY_TO_EMAIL}?subject=${feedbackSubject}&body=${feedbackBody}Not useful" style="background:#7f1d1d;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;margin:0 6px 8px 0">Not useful</a>
       </p>
       <p>Your honest feedback shapes what Aria improves next.</p>`,
      "Create another note",
      `${APP_URL}/notes`
    ),
  });
}

export async function sendFreeUsageNearingLimitEmail(args: {
  to: string;
  organisationId: string;
  fullName: string;
  userId: string;
}) {
  return sendEmail({
    to: args.to,
    type: "free_usage_nearing_limit",
    organisationId: args.organisationId,
    userId: args.userId,
    subject: "You have 1 free Aria Care note left",
    html: shell(
      "You have 1 free note left this month",
      `<p>Hi ${args.fullName.split(" ")[0]},</p>
       <p>You have <strong>1 free note left</strong> this month.</p>
       <p>If Aria Care is saving time after shifts, the Solo plan gives you more room for regular progress notes, handovers and incident/risk drafts.</p>
       <p>Either way, your existing drafts stay available in your workspace.</p>`,
      "View Solo plan",
      `${APP_URL}/billing?reason=solo-note-limit`
    ),
  });
}

export async function sendFreeLimitReachedEmail(args: {
  to: string;
  organisationId: string;
  fullName: string;
  userId: string;
}) {
  return sendEmail({
    to: args.to,
    type: "free_limit_reached",
    organisationId: args.organisationId,
    userId: args.userId,
    subject: "Your free Aria Care notes are used",
    html: shell(
      "Your free notes are used for this month",
      `<p>Hi ${args.fullName.split(" ")[0]},</p>
       <p>You have used your free Aria Care notes for this month.</p>
       <p>The Solo plan is for individual support workers who want regular after-shift documentation help: progress notes, handovers, incident/risk drafts, copy variants and saved private history.</p>
       <p>Upgrade only if it is saving you enough time to be worth it.</p>`,
      "Upgrade Solo",
      `${APP_URL}/billing?reason=solo-note-limit`
    ),
  });
}

export async function sendPaidInactiveCheckInEmail(args: {
  to: string;
  organisationId: string;
  fullName: string;
  userId: string;
}) {
  return sendEmail({
    to: args.to,
    type: "paid_inactive_48h",
    organisationId: args.organisationId,
    userId: args.userId,
    subject: "Checking in on Aria Care",
    html: shell(
      "Just checking in",
      `<p>Hi ${args.fullName.split(" ")[0]},</p>
       <p>Just checking in to see how you&apos;re finding Aria Care so far.</p>
       <p>If you want the quickest test, use one real shift note and check whether the draft is good enough to review and paste into your workplace system.</p>
       <p>If something feels clunky, reply to this email and tell me where it got in your way.</p>`,
      "Open Aria Care",
      `${APP_URL}/notes`
    ),
  });
}

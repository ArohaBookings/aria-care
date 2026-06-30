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
  | "solo_trial_welcome"
  | "solo_trial_ending"
  | "purchase_thank_you"
  | "renewal_reminder"
  | "product_tips"
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
// Shared HTML shell — Aria-branded, works in light AND dark email
// clients (prefers-color-scheme), no template engine needed.
// Signature kept positional so existing templates upgrade for free.
// ------------------------------------------------------------
const BRAND = "linear-gradient(135deg,#0d9488 0%,#0891b2 55%,#06b6d4 100%)";

function shell(heading: string, bodyHtml: string, ctaLabel?: string, ctaUrl?: string, preheader?: string) {
  const cta = ctaLabel && ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px"><tr><td style="border-radius:12px;background:${BRAND};background-color:#0d9488">
         <a href="${ctaUrl}" style="display:inline-block;padding:14px 28px;font-weight:700;font-size:15px;color:#ffffff;text-decoration:none;border-radius:12px">${ctaLabel}</a>
       </td></tr></table>`
    : "";
  const pre = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0">${preheader}</div>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  @media (prefers-color-scheme: dark) {
    .bg-outer { background:#0b1220 !important; }
    .card { background:#111827 !important; border-color:#1f2937 !important; }
    .txt { color:#e5e7eb !important; }
    .txt h1 { color:#f8fafc !important; }
    .txt strong { color:#f8fafc !important; }
    .muted { color:#94a3b8 !important; }
    .panel { background:#0f172a !important; border-color:#1f2937 !important; color:#cbd5e1 !important; }
    .chip { background:#0f3b38 !important; color:#5eead4 !important; }
  }
  a { color:#0d9488; }
</style>
</head>
<body class="bg-outer" style="margin:0;padding:0;background:#eef2f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6">
  ${pre}
  <div style="max-width:560px;margin:0 auto;padding:28px 14px">
    <div style="background:${BRAND};background-color:#0d9488;border-radius:18px 18px 0 0;padding:22px 30px">
      <span style="color:#ffffff;font-size:19px;font-weight:800;letter-spacing:-0.2px">✦ Aria Care</span>
      <span style="color:#cffafe;font-size:12px;font-weight:600;float:right;padding-top:5px">Support documentation, done in seconds</span>
    </div>
    <div class="card" style="background:#ffffff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 18px 18px;padding:34px 30px">
      <h1 class="txt" style="font-size:21px;font-weight:800;margin:0 0 14px;color:#0f172a;line-height:1.3">${heading}</h1>
      <div class="txt" style="color:#334155;font-size:15px">${bodyHtml}</div>
      ${cta}
    </div>
    <div class="muted" style="text-align:center;padding:20px 10px;font-size:12px;color:#64748b">
      Aria Care — clearer support notes, handovers and summaries for Australia &amp; New Zealand.<br/>
      Just reply to this email if you need a hand.<br/>
      <a href="${APP_URL}" style="color:#0d9488;text-decoration:none">${APP_URL.replace(/^https?:\/\//, "")}</a>
    </div>
  </div>
</body>
</html>`;
}

// Reusable styled bits for richer templates (inherit dark-mode via classes above).
function promoBox(code: string, detail: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;width:100%"><tr>
    <td class="panel" style="background:#f0fdfa;border:1px dashed #5eead4;border-radius:12px;padding:16px;text-align:center">
      <div class="muted" style="font-size:12px;color:#0f766e;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Your code</div>
      <div class="txt" style="font-size:24px;font-weight:800;letter-spacing:1px;color:#0f766e;margin:4px 0">${code}</div>
      <div class="muted" style="font-size:13px;color:#64748b">${detail}</div>
    </td></tr></table>`;
}
function tipsList(tips: string[]) {
  return `<ul style="padding-left:18px;margin:14px 0">${tips.map((t) => `<li style="margin:7px 0">${t}</li>`).join("")}</ul>`;
}

// 10% off first month — create a matching promotion code in Stripe (default "ARIA10").
const WELCOME_PROMO_CODE = process.env.ARIA_WELCOME_PROMO_CODE || "ARIA10";

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

const first = (name: string) => (name?.trim()?.split(" ")[0] || "there");

// 1) New Free Solo user — 14-day unlimited trial begins.
export async function sendSoloTrialWelcomeEmail(args: {
  to: string;
  organisationId: string;
  fullName: string;
  userId?: string | null;
  trialDays?: number;
}) {
  const days = args.trialDays ?? 14;
  return sendEmail({
    to: args.to,
    type: "solo_trial_welcome",
    organisationId: args.organisationId,
    userId: args.userId,
    subject: `Welcome to Aria Care — your ${days} days of unlimited notes start now`,
    html: shell(
      `You're in, ${first(args.fullName)} — ${days} days, unlimited notes`,
      `<p>Welcome to Aria Care. For the next <strong>${days} days you have unlimited notes and every note type unlocked</strong> — no card needed.</p>
       <p>The fastest way to feel the difference: at the end of your next shift, speak or type a few rough bullet points and let Aria turn them into a clean, review-ready draft.</p>
       ${tipsList([
         "Try a <strong>voice note</strong> in the car after a shift — Aria writes the structured note.",
         "Switch the output to a <strong>participant-friendly summary</strong> you can read with the person you support.",
         "Use <strong>SOAP</strong> or dot-point format depending on what your workplace wants.",
         "Copy straight into ShiftCare, Lumary, Brevity or any system.",
       ])}
       <p class="muted" style="color:#64748b;font-size:13px">After your trial, Free Solo keeps 10 notes a month — or upgrade any time.</p>`,
      "Create your first note",
      `${APP_URL}/notes`,
      `${days} days of unlimited notes, no card. Here's how to get the most out of it.`
    ),
  });
}

// 2) Trial ending soon — gentle nudge + 10% off first month.
export async function sendSoloTrialEndingEmail(args: {
  to: string;
  organisationId: string;
  fullName: string;
  userId: string;
  daysLeft: number;
}) {
  const d = Math.max(0, args.daysLeft);
  return sendEmail({
    to: args.to,
    type: "solo_trial_ending",
    organisationId: args.organisationId,
    userId: args.userId,
    subject: d <= 0 ? "Your Aria Care trial has ended — 10% off if it helped" : `Your Aria Care trial ends in ${d} day${d === 1 ? "" : "s"} — here's 10% off`,
    html: shell(
      d <= 0 ? "Your free trial has ended" : `${d} day${d === 1 ? "" : "s"} left of unlimited notes`,
      `<p>Hi ${first(args.fullName)},</p>
       <p>${d <= 0 ? "Your 14-day unlimited trial has finished. Free Solo keeps 10 notes a month — and if Aria saved you time after shifts, a Solo plan keeps the unlimited feeling going." : "Your unlimited trial is wrapping up. If Aria has been saving you time on after-shift notes, here's a thank-you for trying it:"}</p>
       ${promoBox(WELCOME_PROMO_CODE, "10% off your first month of any Solo plan")}
       <p class="muted" style="color:#64748b;font-size:13px">Solo is $19/mo (NZ$21) for 125 notes; Solo Pro is $29/mo (NZ$32) for 400. Cancel anytime. Only upgrade if it's worth it for you.</p>`,
      "Upgrade & apply my code",
      `${APP_URL}/billing?reason=solo-trial&promo=${encodeURIComponent(WELCOME_PROMO_CODE)}`,
      d <= 0 ? "10% off your first month if Aria helped." : `Only ${d} day${d === 1 ? "" : "s"} left — plus 10% off your first month.`
    ),
  });
}

// 3) Successful purchase — thank you, getting-started tips, tasteful upgrade nudge.
export async function sendPurchaseThankYouEmail(args: {
  to: string;
  organisationId: string;
  fullName: string;
  userId?: string | null;
  planName: string;
  nextPlan?: { name: string; benefit: string } | null;
}) {
  const upsell = args.nextPlan
    ? `<p class="muted" style="color:#64748b;font-size:13px">When you outgrow it, <strong>${args.nextPlan.name}</strong> adds ${args.nextPlan.benefit} — it's one tap in Billing whenever you're ready. No rush.</p>`
    : "";
  return sendEmail({
    to: args.to,
    type: "purchase_thank_you",
    organisationId: args.organisationId,
    userId: args.userId,
    subject: `Thank you — your Aria Care ${args.planName} is active`,
    html: shell(
      `Thank you, ${first(args.fullName)} — you're on ${args.planName}`,
      `<p>Thank you for backing Aria Care. Your <strong>${args.planName}</strong> plan is active and ready.</p>
       <p>Three quick ways to get the most out of it from day one:</p>
       ${tipsList([
         "Capture by <strong>voice</strong> right after a shift — fastest path from memory to note.",
         "Use the <strong>participant-friendly summary</strong> and read-aloud to involve the person you support.",
         "Generate an <strong>audit-ready report</strong> before plan reviews — clean PDF in a click.",
       ])}
       ${upsell}
       <p>Questions or a feature you'd love? Just reply — real human, fast answer.</p>`,
      "Open Aria Care",
      `${APP_URL}/notes`,
      `You're on ${args.planName}. Here's how to get the most out of it.`
    ),
  });
}

// 4) Subscription renewing soon — value-reinforcing heads-up (reduce churn).
export async function sendRenewalReminderEmail(args: {
  to: string;
  organisationId: string;
  fullName: string;
  userId?: string | null;
  planName: string;
  renewalDate: string;
  amount: string;
  notesThisPeriod?: number;
}) {
  const value = typeof args.notesThisPeriod === "number" && args.notesThisPeriod > 0
    ? `<p>This period you turned <strong>${args.notesThisPeriod} note${args.notesThisPeriod === 1 ? "" : "s"}</strong> into review-ready drafts with Aria — that's real time back after shifts.</p>`
    : "";
  return sendEmail({
    to: args.to,
    type: "renewal_reminder",
    organisationId: args.organisationId,
    userId: args.userId,
    subject: `Your Aria Care ${args.planName} renews on ${args.renewalDate}`,
    html: shell(
      `Your ${args.planName} renews ${args.renewalDate}`,
      `<p>Hi ${first(args.fullName)},</p>
       <p>Just a heads-up that your Aria Care <strong>${args.planName}</strong> renews on <strong>${args.renewalDate}</strong> for <strong>${args.amount}</strong>.</p>
       ${value}
       <p>Nothing to do if you're happy — it renews automatically. You can update your plan or payment details any time in Billing.</p>`,
      "Manage billing",
      `${APP_URL}/billing`,
      `Renews ${args.renewalDate} for ${args.amount}.`
    ),
  });
}

// 5) Periodic product tips — feature education, kept genuinely useful.
export async function sendProductTipsEmail(args: {
  to: string;
  organisationId: string;
  fullName: string;
  userId?: string | null;
  tips?: string[];
}) {
  const tips = args.tips ?? [
    "<strong>Multi-client day</strong>: paste a whole day's rough dump and Aria splits it into separate notes.",
    "<strong>Support log + sign-off</strong>: capture a participant/carer comment and confirmation on the note.",
    "<strong>Coordinator overview</strong> (teams): see concerns, follow-ups and trends per participant at a glance.",
  ];
  return sendEmail({
    to: args.to,
    type: "product_tips",
    organisationId: args.organisationId,
    userId: args.userId,
    subject: "3 ways to get more out of Aria Care",
    html: shell(
      "Get more from Aria Care this month",
      `<p>Hi ${first(args.fullName)}, a few features people tell us they wish they'd found sooner:</p>
       ${tipsList(tips)}
       <p>Anything you'd like Aria to do that it doesn't yet? Reply and tell us — feedback genuinely shapes what we build next.</p>`,
      "Try them now",
      `${APP_URL}/notes`,
      "Three features worth a 30-second look."
    ),
  });
}

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase, requireAdmin, logAdminAction } from "@/lib/supabase/admin";
import { isProviderPlan, isSoloPlan, normalizePlan, productModeForPlan, soloMonthlyNoteLimit } from "@/lib/usage-limits";

export const runtime = "nodejs";

const PLAN_LIMITS: Record<string, number | null> = {
  trial: 10,
  starter: 10,
  growth: 30,
  business: 75,
  solo_free: 0,
  solo: 0,
  solo_pro: 0,
};

const SOLO_DEFAULT_LIMITS: Record<string, number | null> = {
  solo_free: null,
  solo: soloMonthlyNoteLimit("solo"),
  solo_pro: soloMonthlyNoteLimit("solo_pro"),
};

function generateTempPassword() {
  return `Aria-${crypto.randomBytes(6).toString("base64url")}-Change9!`;
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function emptyUsage() {
  return {
    total_solo_notes: 0,
    solo_notes_month: 0,
    copied_month: 0,
    submitted_month: 0,
    last_note_at: null as string | null,
  };
}

function priceToPlanMap() {
  const map = new Map<string, string>();
  const envPairs: Array<[string | undefined, string]> = [
    [process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID, "starter"],
    [process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID, "growth"],
    [process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID, "business"],
    [process.env.NEXT_PUBLIC_STRIPE_SOLO_AUD_PRICE_ID || process.env.STRIPE_SOLO_AUD_PRICE_ID, "solo"],
    [process.env.NEXT_PUBLIC_STRIPE_SOLO_NZD_PRICE_ID || process.env.STRIPE_SOLO_NZD_PRICE_ID, "solo"],
    [process.env.NEXT_PUBLIC_STRIPE_SOLO_PRO_AUD_PRICE_ID || process.env.STRIPE_SOLO_PRO_AUD_PRICE_ID, "solo_pro"],
    [process.env.NEXT_PUBLIC_STRIPE_SOLO_PRO_NZD_PRICE_ID || process.env.STRIPE_SOLO_PRO_NZD_PRICE_ID, "solo_pro"],
  ];

  envPairs.forEach(([priceId, plan]) => {
    if (priceId) map.set(priceId, plan);
  });

  return map;
}

async function resolveTargetUserId(sb: ReturnType<typeof createAdminSupabase>, userId?: string, email?: string) {
  if (userId) return userId;
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("User id or email is required");

  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const authUser = data.users.find((candidate) => normalizeEmail(candidate.email) === normalized);
  if (!authUser) throw new Error(`No auth user found for ${normalized}`);
  return authUser.id;
}

async function ensureWorkspace(
  sb: ReturnType<typeof createAdminSupabase>,
  args: {
    userId: string;
    fallbackEmail?: string | null;
    plan?: string;
    fullName?: string;
    organisationName?: string;
  }
) {
  const { data: authData, error: authError } = await sb.auth.admin.getUserById(args.userId);
  if (authError || !authData.user) throw authError ?? new Error("Auth user not found");

  const authUser = authData.user;
  const email = normalizeEmail(authUser.email ?? args.fallbackEmail);
  if (!email) throw new Error("Target user has no email address");

  const selectedPlan = normalizePlan(args.plan ?? "solo_free");
  const productMode = productModeForPlan(selectedPlan);
  const fullName =
    args.fullName?.trim() ||
    (typeof authUser.user_metadata?.full_name === "string" ? authUser.user_metadata.full_name : "") ||
    email.split("@")[0];
  const organisationName =
    args.organisationName?.trim() ||
    (typeof authUser.user_metadata?.organisation_name === "string" ? authUser.user_metadata.organisation_name : "") ||
    (productMode === "solo" ? `${fullName} Solo Workspace` : `${fullName} Workspace`);

  const { data: existingProfile } = await sb
    .from("users")
    .select("organisation_id, role, account_type")
    .eq("id", args.userId)
    .maybeSingle();

  let organisationId = existingProfile?.organisation_id as string | null | undefined;
  if (!organisationId) {
    const { data: org, error: orgError } = await sb
      .from("organisations")
      .insert({
        name: organisationName,
        contact_email: email,
        subscription_tier: selectedPlan,
        subscription_status: selectedPlan === "trial" ? "trialing" : "active",
        trial_ends_at: selectedPlan === "trial" ? new Date(Date.now() + 14 * 86400000).toISOString() : null,
        product_mode: productMode,
        participant_limit: PLAN_LIMITS[selectedPlan] ?? 0,
        solo_note_limit_override: isSoloPlan(selectedPlan) ? SOLO_DEFAULT_LIMITS[selectedPlan] : null,
      })
      .select("id")
      .single();
    if (orgError) throw orgError;
    organisationId = org.id;
  }

  const { error: upsertError } = await sb.from("users").upsert({
    id: args.userId,
    organisation_id: organisationId,
    email,
    full_name: fullName,
    role: productMode === "solo" ? "support_worker" : (existingProfile?.role ?? "owner"),
    account_type: productMode,
    is_active: true,
  }, { onConflict: "id" });
  if (upsertError) throw upsertError;

  await sb.auth.admin.updateUserById(args.userId, {
    user_metadata: {
      ...(authUser.user_metadata ?? {}),
      full_name: fullName,
      organisation_name: organisationName,
    },
    email_confirm: true,
    ban_duration: "none",
  } as Parameters<typeof sb.auth.admin.updateUserById>[1]);

  return { email, fullName, organisationId, plan: selectedPlan, productMode };
}

async function applyPlan(
  sb: ReturnType<typeof createAdminSupabase>,
  args: {
    userId: string;
    adminId: string;
    plan: string;
    customLimit?: number | null;
    days?: number | null;
    reason?: string | null;
  }
) {
  const plan = normalizePlan(args.plan);
  const productMode = productModeForPlan(plan);
  const { data: profile, error: profileError } = await sb
    .from("users")
    .select("organisation_id")
    .eq("id", args.userId)
    .single();
  if (profileError || !profile?.organisation_id) throw new Error("Target user has no organisation");

  const overrideUntil = args.days && args.days > 0
    ? new Date(Date.now() + args.days * 86400000).toISOString()
    : null;
  const soloLimit = isSoloPlan(plan)
    ? (Number.isFinite(args.customLimit ?? NaN) && (args.customLimit ?? 0) > 0 ? args.customLimit : SOLO_DEFAULT_LIMITS[plan])
    : null;

  await sb.from("users").update({
    account_type: productMode,
    role: productMode === "solo" ? "support_worker" : "owner",
    is_active: true,
  }).eq("id", args.userId);

  const { error } = await sb.from("organisations").update({
    product_mode: productMode,
    subscription_tier: plan,
    subscription_status: "admin_override",
    participant_limit: PLAN_LIMITS[plan] ?? 0,
    solo_note_limit_override: soloLimit,
    trial_ends_at: null,
    admin_plan_override_until: overrideUntil,
    admin_plan_override_reason: args.reason ?? null,
    admin_plan_override_by: args.adminId,
    admin_plan_override_at: new Date().toISOString(),
  }).eq("id", profile.organisation_id);
  if (error) throw error;

  return { plan, productMode, soloLimit, overrideUntil };
}

async function syncStripeSubscription(
  sb: ReturnType<typeof createAdminSupabase>,
  userId: string
) {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  const { data: profile, error: profileError } = await sb
    .from("users")
    .select("organisation_id, organisations(stripe_customer_id, stripe_subscription_id, subscription_tier, product_mode)")
    .eq("id", userId)
    .single();
  if (profileError || !profile?.organisation_id) throw new Error("Target user has no organisation");

  const org = Array.isArray(profile.organisations) ? profile.organisations[0] : profile.organisations;
  let subscriptionId = org?.stripe_subscription_id ?? null;
  if (!subscriptionId && org?.stripe_customer_id) {
    const subs = await stripe.subscriptions.list({
      customer: org.stripe_customer_id,
      status: "all",
      limit: 1,
    });
    subscriptionId = subs.data[0]?.id ?? null;
  }

  if (!subscriptionId) {
    await sb.from("organisations").update({ billing_status_checked_at: new Date().toISOString() }).eq("id", profile.organisation_id);
    return { found: false };
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id ?? "";
  const plan = priceToPlanMap().get(priceId) ?? subscription.metadata.plan ?? org?.subscription_tier ?? "trial";
  const productMode = subscription.metadata.product_mode ?? (plan.startsWith("solo") ? "solo" : org?.product_mode ?? "provider");
  const activeLike = subscription.status === "active" || subscription.status === "trialing";
  const fallbackPlan = productMode === "solo" ? "solo_free" : "trial";

  await sb.from("organisations").update({
    subscription_status: subscription.status,
    subscription_tier: activeLike ? plan : fallbackPlan,
    product_mode: productMode,
    stripe_subscription_id: subscription.id,
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    participant_limit: PLAN_LIMITS[activeLike ? plan : fallbackPlan] ?? 0,
    billing_status_checked_at: new Date().toISOString(),
  }).eq("id", profile.organisation_id);

  return { found: true, plan, status: subscription.status };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await requireAdmin(user.id);

    const search = normalizeEmail(request.nextUrl.searchParams.get("search"));
    const sb = createAdminSupabase();

    let query = sb
      .from("users")
      .select("id, organisation_id, email, full_name, role, is_active, account_type, force_password_change, password_reset_required_at, last_admin_password_reset_at, solo_usage_reset_at, created_at, organisations(name, subscription_tier, subscription_status, product_mode, stripe_customer_id, stripe_subscription_id, solo_note_limit_override, admin_plan_override_until, billing_status_checked_at)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();

    const [{ data: users, error }, { data: authData }, { data: soloUsageRows }] = await Promise.all([
      query,
      sb.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      sb.from("solo_notes").select("user_id, created_at, copied_at, submitted_at").limit(10000),
    ]);
    if (error) throw error;

    const authById = new Map((authData?.users ?? []).map((authUser) => [authUser.id, authUser]));
    const publicIds = new Set((users ?? []).map((row) => row.id));
    const usageByUser = new Map<string, ReturnType<typeof emptyUsage>>();

    (soloUsageRows ?? []).forEach((row) => {
      if (!row.user_id) return;
      const current = usageByUser.get(row.user_id) ?? emptyUsage();
      current.total_solo_notes += 1;
      if (row.created_at >= monthStart) {
        current.solo_notes_month += 1;
        if (row.copied_at) current.copied_month += 1;
        if (row.submitted_at) current.submitted_month += 1;
      }
      if (!current.last_note_at || row.created_at > current.last_note_at) {
        current.last_note_at = row.created_at;
      }
      usageByUser.set(row.user_id, current);
    });

    const authOnlyUsers = (authData?.users ?? [])
      .filter((authUser) => !publicIds.has(authUser.id))
      .filter((authUser) => !search || normalizeEmail(authUser.email).includes(search))
      .map((authUser) => ({
        id: authUser.id,
        organisation_id: null,
        email: authUser.email ?? "",
        full_name: authUser.user_metadata?.full_name ?? "",
        role: "missing_profile",
        account_type: null,
        is_active: false,
        profile_missing: true,
        force_password_change: false,
        password_reset_required_at: null,
        last_admin_password_reset_at: null,
        solo_usage_reset_at: null,
        created_at: authUser.created_at,
        organisations: null,
        usage: emptyUsage(),
        auth: {
          email_confirmed: !!authUser.email_confirmed_at,
          last_sign_in_at: authUser.last_sign_in_at,
          banned_until: authUser.banned_until,
        },
      }));

    const enriched = (users ?? []).map((row) => {
      const authUser = authById.get(row.id);
      return {
        ...row,
        profile_missing: false,
        usage: usageByUser.get(row.id) ?? emptyUsage(),
        auth: authUser ? {
          email_confirmed: !!authUser.email_confirmed_at,
          last_sign_in_at: authUser.last_sign_in_at,
          banned_until: authUser.banned_until,
        } : null,
      };
    });

    return NextResponse.json({ users: [...authOnlyUsers, ...enriched] });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    if (msg.includes("admin")) return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = await requireAdmin(user.id);

    const body = await request.json();
    const { action, email, password } = body;
    const sb = createAdminSupabase();
    const targetUserId = await resolveTargetUserId(sb, body.userId, email);
    const targetEmail = normalizeEmail(email);

    switch (action) {
      case "repair_account": {
        const result = await ensureWorkspace(sb, {
          userId: targetUserId,
          fallbackEmail: targetEmail,
          plan: body.plan ?? "solo_free",
          fullName: body.fullName,
          organisationName: body.organisationName,
        });
        await logAdminAction(admin.id, admin.email, "repair_account", "user", targetUserId, { email: result.email, plan: result.plan });
        return NextResponse.json({ message: `${result.email} repaired and ready for login` });
      }

      case "reset_password":
      case "reset_password_in_app": {
        const tempPassword = typeof password === "string" && password.length >= 8 ? password : generateTempPassword();
        const result = await ensureWorkspace(sb, {
          userId: targetUserId,
          fallbackEmail: targetEmail,
          plan: body.plan ?? "solo_free",
        });
        const { error } = await sb.auth.admin.updateUserById(targetUserId, {
          password: tempPassword,
          email_confirm: true,
          ban_duration: "none",
        } as Parameters<typeof sb.auth.admin.updateUserById>[1]);
        if (error) throw error;

        await sb.from("users").update({
          is_active: true,
          force_password_change: true,
          password_reset_required_at: new Date().toISOString(),
          password_reset_reason: "Admin reset",
          last_admin_password_reset_at: new Date().toISOString(),
          last_admin_password_reset_by: admin.id,
        }).eq("id", targetUserId);

        await logAdminAction(admin.id, admin.email, "reset_password_in_app", "user", targetUserId, { email: result.email });
        return NextResponse.json({
          message: `Temporary password created for ${result.email}. They will be forced to change it on-screen.`,
          tempPassword,
        });
      }

      case "set_password": {
        if (!password || password.length < 8) throw new Error("Password must be at least 8 characters");
        const result = await ensureWorkspace(sb, {
          userId: targetUserId,
          fallbackEmail: targetEmail,
          plan: body.plan ?? "solo_free",
        });
        const { error } = await sb.auth.admin.updateUserById(targetUserId, {
          password,
          email_confirm: true,
          ban_duration: "none",
        } as Parameters<typeof sb.auth.admin.updateUserById>[1]);
        if (error) throw error;

        const forceChange = body.forceChange !== false;
        await sb.from("users").update({
          is_active: true,
          force_password_change: forceChange,
          password_reset_required_at: forceChange ? new Date().toISOString() : null,
          password_reset_reason: forceChange ? "Admin set temporary password" : null,
          last_admin_password_reset_at: new Date().toISOString(),
          last_admin_password_reset_by: admin.id,
          last_password_changed_at: forceChange ? null : new Date().toISOString(),
        }).eq("id", targetUserId);

        await logAdminAction(admin.id, admin.email, "set_password", "user", targetUserId, { email: result.email, forceChange });
        return NextResponse.json({ message: forceChange ? "Password set. User must change it on next screen." : "Password updated successfully" });
      }

      case "force_password_change": {
        await ensureWorkspace(sb, { userId: targetUserId, fallbackEmail: targetEmail, plan: body.plan ?? "solo_free" });
        await sb.from("users").update({
          force_password_change: true,
          password_reset_required_at: new Date().toISOString(),
          password_reset_reason: body.reason ?? "Admin requested password change",
        }).eq("id", targetUserId);
        await logAdminAction(admin.id, admin.email, "force_password_change", "user", targetUserId, { email: targetEmail });
        return NextResponse.json({ message: "User will be prompted to change password on next access" });
      }

      case "clear_password_change": {
        await sb.from("users").update({
          force_password_change: false,
          password_reset_required_at: null,
          password_reset_reason: null,
        }).eq("id", targetUserId);
        await logAdminAction(admin.id, admin.email, "clear_password_change", "user", targetUserId, { email: targetEmail });
        return NextResponse.json({ message: "Forced password-change prompt cleared" });
      }

      case "make_admin": {
        const { data: targetUser } = await sb.auth.admin.getUserById(targetUserId);
        if (!targetUser?.user) throw new Error("User not found");
        await sb.from("admin_users").upsert({
          id: targetUserId,
          email: targetUser.user.email ?? targetEmail,
          full_name: targetUser.user.user_metadata?.full_name ?? targetEmail,
          is_active: true,
        }, { onConflict: "id" });
        await logAdminAction(admin.id, admin.email, "make_admin", "user", targetUserId, { email: targetEmail });
        return NextResponse.json({ message: `${targetUser.user.email ?? targetEmail} granted admin access` });
      }

      case "remove_admin": {
        await sb.from("admin_users").update({ is_active: false }).eq("id", targetUserId);
        await logAdminAction(admin.id, admin.email, "remove_admin", "user", targetUserId, { email: targetEmail });
        return NextResponse.json({ message: `Admin access revoked for ${targetEmail}` });
      }

      case "grant_plan":
      case "grant_solo":
      case "grant_solo_pro":
      case "grant_solo_free": {
        const plan =
          action === "grant_solo_pro" ? "solo_pro" :
          action === "grant_solo" ? "solo" :
          action === "grant_solo_free" ? "solo_free" :
          body.plan;
        if (!isSoloPlan(plan) && !isProviderPlan(plan)) throw new Error("Invalid plan");
        await ensureWorkspace(sb, { userId: targetUserId, fallbackEmail: targetEmail, plan });
        const result = await applyPlan(sb, {
          userId: targetUserId,
          adminId: admin.id,
          plan,
          customLimit: typeof body.customLimit === "number" ? body.customLimit : null,
          days: typeof body.days === "number" ? body.days : null,
          reason: body.reason ?? null,
        });
        await logAdminAction(admin.id, admin.email, "grant_plan", "user", targetUserId, { email: targetEmail, ...result });
        return NextResponse.json({ message: `${targetEmail} granted ${result.plan.replace("_", " ")} access` });
      }

      case "set_custom_solo_limit": {
        const customLimit = Number(body.customLimit);
        if (!Number.isFinite(customLimit) || customLimit < 1) throw new Error("Custom limit must be a positive number");
        const { data: targetProfile } = await sb.from("users").select("organisation_id").eq("id", targetUserId).single();
        if (!targetProfile?.organisation_id) throw new Error("Target user has no organisation");
        await sb.from("organisations").update({ solo_note_limit_override: customLimit }).eq("id", targetProfile.organisation_id);
        await logAdminAction(admin.id, admin.email, "set_custom_solo_limit", "user", targetUserId, { email: targetEmail, customLimit });
        return NextResponse.json({ message: `Solo note limit set to ${customLimit}/month` });
      }

      case "reset_solo_usage": {
        await sb.from("users").update({ solo_usage_reset_at: new Date().toISOString() }).eq("id", targetUserId);
        await logAdminAction(admin.id, admin.email, "reset_solo_usage", "user", targetUserId, { email: targetEmail });
        return NextResponse.json({ message: "Solo usage reset for the current month without deleting note history" });
      }

      case "sync_stripe": {
        const result = await syncStripeSubscription(sb, targetUserId);
        await logAdminAction(admin.id, admin.email, "sync_stripe", "user", targetUserId, { email: targetEmail, ...result });
        return NextResponse.json({ message: result.found ? `Stripe synced: ${result.plan} (${result.status})` : "No Stripe subscription found for this user" });
      }

      case "disable": {
        await sb.auth.admin.updateUserById(targetUserId, { ban_duration: "876600h" });
        await sb.from("users").update({ is_active: false }).eq("id", targetUserId);
        await logAdminAction(admin.id, admin.email, "disable", "user", targetUserId, { email: targetEmail });
        return NextResponse.json({ message: `Account disabled: ${targetEmail}` });
      }

      case "enable": {
        await sb.auth.admin.updateUserById(targetUserId, { ban_duration: "none", email_confirm: true } as Parameters<typeof sb.auth.admin.updateUserById>[1]);
        await ensureWorkspace(sb, { userId: targetUserId, fallbackEmail: targetEmail, plan: body.plan ?? "solo_free" });
        await sb.from("users").update({ is_active: true }).eq("id", targetUserId);
        await logAdminAction(admin.id, admin.email, "enable", "user", targetUserId, { email: targetEmail });
        return NextResponse.json({ message: `Account enabled: ${targetEmail}` });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Action failed";
    if (msg.includes("admin")) return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

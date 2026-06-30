import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { productModeForPlan } from "@/lib/usage-limits";
import { sendWelcomeEmail } from "@/lib/email/send";

export const runtime = "nodejs";

type SignupBody = {
  email?: string;
  password?: string;
  full_name?: string;
  organisation_name?: string;
  plan?: string;
};

async function signupInstantly(args: {
  email: string;
  password: string;
  metadata: {
    full_name: string;
    organisation_name: string;
    plan_intent: string;
  };
}) {
  const admin = createAdminSupabase();
  const { data, error } = await admin.auth.admin.createUser({
    email: args.email,
    password: args.password,
    email_confirm: true,
    user_metadata: args.metadata,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const userId = data.user?.id;
  if (userId) {
    const isSoloIntent = args.metadata.plan_intent.startsWith("solo");
    const initialPlan = isSoloIntent ? "solo_free" : "trial";
    const productMode = productModeForPlan(initialPlan);
    const { data: profile } = await admin
      .from("users")
      .select("organisation_id")
      .eq("id", userId)
      .maybeSingle();

    let organisationId = profile?.organisation_id as string | null | undefined;
    if (!organisationId) {
      const { data: org, error: orgError } = await admin
        .from("organisations")
        .insert({
          name: args.metadata.organisation_name,
          contact_email: args.email,
          subscription_tier: initialPlan,
          subscription_status: initialPlan === "trial" ? "trialing" : "active",
          trial_ends_at: initialPlan === "trial" ? new Date(Date.now() + 14 * 86400000).toISOString() : null,
          product_mode: productMode,
          participant_limit: isSoloIntent ? 0 : 10,
          solo_note_limit_override: isSoloIntent ? null : null,
        })
        .select("id")
        .single();
      if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 });
      organisationId = org.id;
    } else {
      const { error: orgUpdateError } = await admin
        .from("organisations")
        .update({
          name: args.metadata.organisation_name,
          contact_email: args.email,
          subscription_tier: initialPlan,
          subscription_status: initialPlan === "trial" ? "trialing" : "active",
          trial_ends_at: initialPlan === "trial" ? new Date(Date.now() + 14 * 86400000).toISOString() : null,
          product_mode: productMode,
          participant_limit: isSoloIntent ? 0 : 10,
          solo_note_limit_override: null,
        })
        .eq("id", organisationId);
      if (orgUpdateError) return NextResponse.json({ error: orgUpdateError.message }, { status: 500 });
    }

    const { error: profileError } = await admin.from("users").upsert({
      id: userId,
      organisation_id: organisationId,
      email: args.email,
      full_name: args.metadata.full_name,
      role: isSoloIntent ? "support_worker" : "owner",
      account_type: isSoloIntent ? "solo" : "provider",
      is_active: true,
    }, { onConflict: "id" });
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
    if (!organisationId) return NextResponse.json({ error: "Organisation could not be created" }, { status: 500 });

    await sendWelcomeEmail({
      to: args.email,
      organisationId,
      userId,
      fullName: args.metadata.full_name,
    });
  }

  return NextResponse.json({ ok: true, delivery: "instant" });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignupBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const fullName = body.full_name?.trim() ?? "";
    const plan = body.plan?.trim() ?? "starter";
    const organisationName = body.organisation_name?.trim() || (plan.startsWith("solo") ? "Solo Workspace" : "");

    if (!email || !password || !fullName || !organisationName) {
      return NextResponse.json({ error: "Missing required signup fields" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const metadata = {
      full_name: fullName,
      organisation_name: organisationName,
      plan_intent: plan,
    };

    // Product signup is intentionally immediate: no confirmation emails,
    // no magic links, no waiting room. The client signs in right after this.
    return signupInstantly({
      email,
      password,
      metadata,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create account" },
      { status: 500 }
    );
  }
}

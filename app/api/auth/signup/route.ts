import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/app-url";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sendSignupConfirmationEmail } from "@/lib/email/send";

export const runtime = "nodejs";

type SignupBody = {
  email?: string;
  password?: string;
  full_name?: string;
  organisation_name?: string;
  plan?: string;
};

const RESEND_AUTH_EMAILS_ENABLED = process.env.RESEND_AUTH_EMAILS === "true";

function createAnonSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function signupWithSupabaseEmail(args: {
  email: string;
  password: string;
  redirectTo: string;
  metadata: {
    full_name: string;
    organisation_name: string;
    plan_intent: string;
  };
}) {
  const anon = createAnonSupabase();
  const { error } = await anon.auth.signUp({
    email: args.email,
    password: args.password,
    options: {
      emailRedirectTo: args.redirectTo,
      data: args.metadata,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, delivery: "supabase" });
}

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
  const { error } = await admin.auth.admin.createUser({
    email: args.email,
    password: args.password,
    email_confirm: true,
    user_metadata: args.metadata,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, delivery: "instant" });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignupBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const fullName = body.full_name?.trim() ?? "";
    const organisationName = body.organisation_name?.trim() ?? "";
    const plan = body.plan?.trim() ?? "starter";

    if (!email || !password || !fullName || !organisationName) {
      return NextResponse.json({ error: "Missing required signup fields" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const redirectTo = `${getAppUrl(request)}/auth/complete?type=signup`;
    const metadata = {
      full_name: fullName,
      organisation_name: organisationName,
      plan_intent: plan,
    };

    // Keep the custom Resend auth path in place for later, but default to
    // Supabase's managed auth emails until a verified Resend sending domain
    // exists for production use.
    if (process.env.RESEND_API_KEY && RESEND_AUTH_EMAILS_ENABLED) {
      const admin = createAdminSupabase();
      const { data, error } = await admin.auth.admin.generateLink({
        type: "signup",
        email,
        password,
        options: {
          data: metadata,
          redirectTo,
        },
      });

      if (!error) {
        const actionLink = data.properties?.action_link;

        if (actionLink) {
          const emailResult = await sendSignupConfirmationEmail({
            to: email,
            fullName,
            organisationName,
            actionLink,
          });

          if (emailResult.ok) {
            return NextResponse.json({ ok: true, delivery: "resend" });
          }
        }

        const anon = createAnonSupabase();
        const { error: resendError } = await anon.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: redirectTo },
        });

        if (!resendError) {
          return NextResponse.json({ ok: true, delivery: "supabase" });
        }

        return NextResponse.json(
          { error: "We created your account but could not send the confirmation email. Please try again." },
          { status: 500 }
        );
      }
    }

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

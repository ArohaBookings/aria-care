import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("organisation_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !["owner", "coordinator"].includes(profile.role ?? "")) {
      return NextResponse.json({ error: "Only owners and coordinators can invite staff" }, { status: 403 });
    }

    const { email, full_name, role } = await request.json();
    if (!email || !full_name) return NextResponse.json({ error: "Email and name required" }, { status: 400 });

    // Check subscription limits for staff
    const { data: org } = await supabase
      .from("organisations")
      .select("subscription_tier")
      .eq("id", profile.organisation_id)
      .single();

    const staffLimits: Record<string, number> = {
      trial: 3, starter: 3, growth: Infinity, business: Infinity,
    };
    const { count: staffCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", profile.organisation_id)
      .eq("is_active", true);

    if ((staffCount ?? 0) >= (staffLimits[org?.subscription_tier ?? "trial"] ?? 3)) {
      return NextResponse.json({ error: "Staff limit reached for your plan. Upgrade to add more team members." }, { status: 403 });
    }

    // Invite user via Supabase Auth (sends email invite)
    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name,
        organisation_id: profile.organisation_id,
        invited_role: role ?? "support_worker",
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    });

    if (inviteError) throw inviteError;

    // Pre-create user record in our users table so they have org context on first login
    await adminClient.from("users").upsert({
      id: invited.user.id,
      organisation_id: profile.organisation_id,
      email,
      full_name,
      role: role ?? "support_worker",
      is_active: true,
    }, { onConflict: "id" });

    return NextResponse.json({ success: true, message: `Invitation sent to ${email}` });
  } catch (error) {
    console.error("Staff invite error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send invitation" },
      { status: 500 }
    );
  }
}

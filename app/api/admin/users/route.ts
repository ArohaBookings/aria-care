import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase, requireAdmin, logAdminAction } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = await requireAdmin(user.id);

    const search = request.nextUrl.searchParams.get("search") ?? "";
    const sb = createAdminSupabase();

    let query = sb
      .from("users")
      .select("id, email, full_name, role, is_active, created_at, organisations(name, subscription_tier)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data: users, error } = await query;
    if (error) throw error;

    return NextResponse.json({ users });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    if (msg.includes("admin")) return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const appUrl = getAppUrl(request);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = await requireAdmin(user.id);

    const body = await request.json();
    const { action, userId, email, password } = body;
    const sb = createAdminSupabase();

    switch (action) {
      case "reset_password": {
        // Send password reset email via Supabase
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${appUrl}/auth/complete?type=recovery`,
        });
        if (error) throw error;
        await logAdminAction(admin.id, admin.email, "reset_password", "user", userId, { email });
        return NextResponse.json({ message: `Password reset email sent to ${email}` });
      }

      case "magic_link": {
        const { data, error } = await sb.auth.admin.generateLink({
          type: "magiclink",
          email,
        });
        if (error) throw error;
        await logAdminAction(admin.id, admin.email, "magic_link", "user", userId, { email });
        return NextResponse.json({ message: "Magic link generated", link: data.properties?.action_link });
      }

      case "set_password": {
        if (!password || password.length < 6) throw new Error("Password must be at least 6 characters");
        const { error } = await sb.auth.admin.updateUserById(userId, { password });
        if (error) throw error;
        await logAdminAction(admin.id, admin.email, "set_password", "user", userId, { email });
        return NextResponse.json({ message: "Password updated successfully" });
      }

      case "make_admin": {
        // Get user details
        const { data: targetUser } = await sb.auth.admin.getUserById(userId);
        if (!targetUser?.user) throw new Error("User not found");
        await sb.from("admin_users").upsert({
          id: userId,
          email: targetUser.user.email ?? email,
          full_name: targetUser.user.user_metadata?.full_name ?? email,
          is_active: true,
        }, { onConflict: "id" });
        await logAdminAction(admin.id, admin.email, "make_admin", "user", userId, { email });
        return NextResponse.json({ message: `${email} granted admin access` });
      }

      case "remove_admin": {
        await sb.from("admin_users").update({ is_active: false }).eq("id", userId);
        await logAdminAction(admin.id, admin.email, "remove_admin", "user", userId, { email });
        return NextResponse.json({ message: `Admin access revoked for ${email}` });
      }

      case "disable": {
        await sb.auth.admin.updateUserById(userId, { ban_duration: "876600h" }); // ~100 years
        await sb.from("users").update({ is_active: false }).eq("id", userId);
        await logAdminAction(admin.id, admin.email, "disable", "user", userId, { email });
        return NextResponse.json({ message: `Account disabled: ${email}` });
      }

      case "enable": {
        await sb.auth.admin.updateUserById(userId, { ban_duration: "none" });
        await sb.from("users").update({ is_active: true }).eq("id", userId);
        await logAdminAction(admin.id, admin.email, "enable", "user", userId, { email });
        return NextResponse.json({ message: `Account enabled: ${email}` });
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

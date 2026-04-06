import { createClient } from "@supabase/supabase-js";

const FALLBACK_ADMIN_EMAILS = new Set(
  [
    "leoanthonybons@gmail.com",
    ...(process.env.ADMIN_EMAILS?.split(",") ?? []),
  ]
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

// Service role client — bypasses RLS entirely
// ONLY use server-side in API routes
export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Log an admin action to the audit trail
export async function logAdminAction(
  adminId: string,
  adminEmail: string,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> = {}
) {
  const sb = createAdminSupabase();
  try {
    await sb.from("admin_audit_log").insert({
      admin_id: adminId,
      admin_email: adminEmail,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    });
  } catch (error) {
    console.warn("[admin] audit log unavailable:", error);
  }
}

// Verify a user is an admin — throws if not
export async function requireAdmin(userId: string): Promise<{ id: string; email: string; full_name: string }> {
  const sb = createAdminSupabase();
  const { data, error } = await sb
    .from("admin_users")
    .select("id, email, full_name")
    .eq("id", userId)
    .eq("is_active", true)
    .single();

  if (!error && data) {
    try {
      await sb.from("admin_users").update({ last_login_at: new Date().toISOString() }).eq("id", userId);
    } catch {
      // Best-effort only.
    }

    return data;
  }

  const { data: authUserData, error: authError } = await sb.auth.admin.getUserById(userId);
  const authUser = authUserData.user;
  const authEmail = authUser?.email?.toLowerCase() ?? "";

  if (authError || !authUser || !FALLBACK_ADMIN_EMAILS.has(authEmail)) {
    throw new Error("Forbidden: admin access required");
  }

  return {
    id: authUser.id,
    email: authUser.email ?? authEmail,
    full_name: authUser.user_metadata?.full_name ?? authUser.email ?? "Admin",
  };
}

import { createClient } from "@supabase/supabase-js";

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
  await sb.from("admin_audit_log").insert({
    admin_id: adminId,
    admin_email: adminEmail,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
  });
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

  if (error || !data) {
    throw new Error("Forbidden: admin access required");
  }

  // Update last login
  await sb.from("admin_users").update({ last_login_at: new Date().toISOString() }).eq("id", userId);

  return data;
}

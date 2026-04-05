import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin");

  // Verify admin status
  const adminSb = createAdminSupabase();
  const { data: adminUser } = await adminSb
    .from("admin_users")
    .select("id, email, full_name, is_active")
    .eq("id", user.id)
    .eq("is_active", true)
    .single();

  if (!adminUser) redirect("/dashboard?error=not_admin");

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <AdminSidebar admin={{ email: adminUser.email, name: adminUser.full_name ?? adminUser.email }} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 border-b border-slate-800 flex items-center px-6 bg-slate-900/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-1 rounded-lg uppercase tracking-widest">Admin</span>
            <span className="text-slate-600 text-xs">·</span>
            <span className="text-xs text-slate-400 font-mono">{adminUser.email}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role, organisation_id, organisations(name, subscription_tier, trial_ends_at)")
    .eq("id", user.id)
    .single();

  const org = profile?.organisations as unknown as { name: string; subscription_tier: string; trial_ends_at: string } | null;
  const trialDaysLeft = org?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  // Fetch active system announcements
  let announcements: { id: string; title: string; message: string; type: string }[] = [];
  try {
    const adminSb = createAdminSupabase();
    const { data } = await adminSb
      .from("system_announcements")
      .select("id, title, message, type")
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(2);
    announcements = data ?? [];
  } catch { /* table may not exist yet — silently ignore */ }

  const ANNOUNCEMENT_STYLES: Record<string, string> = {
    info: "bg-blue-900/30 border-blue-500/30 text-blue-300",
    warning: "bg-amber-900/30 border-amber-500/30 text-amber-300",
    critical: "bg-red-900/40 border-red-500/40 text-red-300",
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        userEmail={user.email ?? ""}
        userName={profile?.full_name ?? ""}
        userRole={profile?.role ?? "support_worker"}
        orgName={org?.name ?? ""}
        subscriptionTier={org?.subscription_tier ?? "trial"}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Trial warning banner */}
        {org?.subscription_tier === "trial" && trialDaysLeft <= 7 && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between flex-shrink-0">
            <p className="text-xs text-amber-800 font-medium">
              ⏳ {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left in your free trial
            </p>
            <a href="/billing" className="text-xs font-bold text-amber-800 underline">Upgrade now →</a>
          </div>
        )}
        {/* System announcements */}
        {announcements.map(ann => (
          <div key={ann.id} className={`border-b px-6 py-2 flex-shrink-0 ${ANNOUNCEMENT_STYLES[ann.type] ?? ANNOUNCEMENT_STYLES.info}`}>
            <p className="text-xs font-medium"><span className="font-bold">{ann.title}: </span>{ann.message}</p>
          </div>
        ))}
        <TopBar userName={profile?.full_name ?? ""} orgName={org?.name ?? ""} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Mic, Users, AlertTriangle, Clock, ArrowRight, CheckCircle, Shield, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Dashboard | Aria" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("full_name, organisation_id, organisations(name)").eq("id", user.id).single();
  const orgId = profile?.organisation_id;

  const [{ count: participantCount }, { count: pendingNotes }, { data: expiringCompliance }, { data: recentNotes }, { data: upcomingShifts }] = await Promise.all([
    supabase.from("participants").select("*", { count: "exact", head: true }).eq("organisation_id", orgId).eq("status", "active"),
    supabase.from("progress_notes").select("*", { count: "exact", head: true }).eq("organisation_id", orgId).eq("status", "pending"),
    supabase.from("staff_compliance").select("item_label, expiry_date, users(full_name)").eq("organisation_id", orgId).eq("status", "expiring_soon").limit(5),
    supabase.from("progress_notes").select("id, created_at, note_text, status, participants(full_name), author_name").eq("organisation_id", orgId).order("created_at", { ascending: false }).limit(5),
    supabase.from("shifts").select("id, shift_date, start_time, participants(full_name), users(full_name)").eq("organisation_id", orgId).gte("shift_date", new Date().toISOString().split("T")[0]).order("shift_date").limit(5),
  ]);

  const firstName = (profile?.full_name ?? "there").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 max-w-7xl space-y-6">
      {/* Greeting */}
      <div className="animate-fade-up">
        <h2 className="font-display text-2xl font-bold text-slate-900">{greeting}, {firstName} 👋</h2>
        <p className="text-slate-500 text-sm mt-0.5">Here&apos;s what needs your attention today.</p>
      </div>

      {/* Quick action hero */}
      <Link href="/notes" className="group block card bg-gradient-to-r from-aria-600 to-teal-600 border-0 p-6 text-white hover:shadow-teal transition-all duration-200 animate-fade-up-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-lg">Record a Progress Note</p>
              <p className="text-white/75 text-sm">Tap to record — Aria writes the note for you</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-up-2">
        <StatCard icon={Users} label="Active Participants" value={participantCount ?? 0} color="teal" />
        <StatCard icon={Clock} label="Notes Pending Review" value={pendingNotes ?? 0} color={pendingNotes ? "amber" : "teal"} href="/notes?status=pending" />
        <StatCard icon={AlertTriangle} label="Expiring Compliance" value={expiringCompliance?.length ?? 0} color={expiringCompliance?.length ? "red" : "teal"} href="/compliance" />
        <StatCard icon={Calendar} label="Shifts This Week" value={upcomingShifts?.length ?? 0} color="teal" href="/rostering" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent notes */}
        <div className="lg:col-span-2 card p-5 animate-fade-up-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-slate-900">Recent Notes</h3>
            <Link href="/notes" className="text-xs text-aria-600 font-semibold hover:underline">View all →</Link>
          </div>
          {!recentNotes?.length ? (
            <EmptyState icon={Mic} text="No notes yet — record your first one above" />
          ) : (
            <div className="space-y-2">
              {recentNotes.map((note: any) => (
                <Link key={note.id} href={`/notes`} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${note.status === "approved" ? "bg-emerald-500" : "bg-amber-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{note.participants?.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{note.note_text?.slice(0, 80)}...</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`badge text-[10px] ${note.status === "approved" ? "badge-green" : "badge-yellow"}`}>{note.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4 animate-fade-up-4">
          {/* Upcoming shifts */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-slate-900">Upcoming Shifts</h3>
              <Link href="/rostering" className="text-xs text-aria-600 font-semibold hover:underline">Roster →</Link>
            </div>
            {!upcomingShifts?.length ? (
              <EmptyState icon={Calendar} text="No shifts scheduled" />
            ) : (
              <div className="space-y-2">
                {upcomingShifts.map((shift: any) => (
                  <div key={shift.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="w-8 h-8 bg-aria-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-aria-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{shift.participants?.full_name}</p>
                      <p className="text-[11px] text-slate-500">{formatDate(shift.shift_date)} · {shift.start_time?.slice(0,5)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compliance alerts */}
          {(expiringCompliance?.length ?? 0) > 0 && (
            <div className="card p-5 border-amber-200 bg-amber-50/50">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-amber-800 text-sm">Compliance Alerts</h3>
              </div>
              <div className="space-y-2">
                {expiringCompliance?.map((item: any) => (
                  <div key={item.id} className="text-xs text-amber-700">
                    <span className="font-semibold">{(item.users as any)?.full_name}</span> — {item.item_label} expires {formatDate(item.expiry_date)}
                  </div>
                ))}
              </div>
              <Link href="/compliance" className="mt-3 text-xs font-bold text-amber-700 hover:underline block">View all →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, href }: { icon: React.ElementType; label: string; value: number; color: string; href?: string }) {
  const content = (
    <div className={`card card-hover p-5 ${href ? "cursor-pointer" : ""}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color === "teal" ? "bg-aria-50 text-aria-600" : color === "amber" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="font-display text-3xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <Icon className="w-8 h-8 text-slate-300 mb-2" />
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}

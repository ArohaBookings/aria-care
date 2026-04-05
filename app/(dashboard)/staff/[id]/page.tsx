import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Shield, Clock, FileText, AlertCircle } from "lucide-react";
import { formatDate, daysUntil } from "@/lib/utils";
import StaffControls from "./staff-controls";

export const metadata = { title: "Staff member | Aria" };

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("users")
    .select("id, full_name, email, role, is_active, avatar_url, created_at, organisation_id")
    .eq("id", id)
    .single();

  if (!staff) notFound();

  // Current viewer — to decide whether to show role/edit controls
  const { data: { user: viewer } } = await supabase.auth.getUser();
  const { data: viewerProfile } = viewer
    ? await supabase.from("users").select("role").eq("id", viewer.id).single()
    : { data: null };
  const canEdit = ["owner", "manager"].includes(viewerProfile?.role ?? "");

  const { data: compliance } = await supabase
    .from("staff_compliance")
    .select("id, item_label, item_type, expiry_date, status, document_url")
    .eq("user_id", id)
    .order("expiry_date", { ascending: true, nullsFirst: false });

  const { data: notes } = await supabase
    .from("progress_notes")
    .select("id, created_at, note_text, status, participants(full_name)")
    .eq("author_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, shift_date, start_time, end_time, status, participants(full_name)")
    .eq("worker_id", id)
    .order("shift_date", { ascending: false })
    .limit(5);

  const initials = (staff.full_name || staff.email || "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="p-6 max-w-6xl">
      <Link href="/staff" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to staff
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-aria-gradient flex items-center justify-center text-xl font-bold text-white">
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-slate-900">{staff.full_name || staff.email}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
              {staff.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {staff.email}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> {staff.role}
              </span>
              <span className={staff.is_active ? "badge-green" : "badge-slate"}>
                {staff.is_active ? "active" : "inactive"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Joined {formatDate(staff.created_at)}</p>
          </div>
        </div>

        {canEdit && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <StaffControls staffId={staff.id} initialRole={staff.role} initialActive={staff.is_active} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Compliance</h2>
          </div>
          {!compliance?.length ? (
            <div className="p-6 text-center text-sm text-slate-500">
              No compliance items yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {compliance.map((c) => {
                const days = c.expiry_date ? daysUntil(c.expiry_date) : null;
                return (
                  <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{c.item_label}</p>
                      <p className="text-xs text-slate-500">
                        {c.expiry_date ? `Expires ${formatDate(c.expiry_date)}` : "No expiry"}
                      </p>
                    </div>
                    <span
                      className={
                        c.status === "expired"
                          ? "badge-red"
                          : c.status === "expiring_soon"
                          ? "badge-yellow"
                          : "badge-green"
                      }
                    >
                      {c.status === "expiring_soon" && days !== null ? `${days}d` : c.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Recent shifts</h2>
          </div>
          {!shifts?.length ? (
            <div className="p-6 text-center text-sm text-slate-500">No shifts yet.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {shifts.map((s) => {
                const p = Array.isArray(s.participants) ? s.participants[0] : s.participants;
                return (
                  <div key={s.id} className="px-5 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900">{p?.full_name ?? "—"}</p>
                      <span className="text-xs text-slate-500">{formatDate(s.shift_date)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {s.start_time} – {s.end_time} · {s.status}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Recent notes authored</h2>
          </div>
          {!notes?.length ? (
            <div className="p-6 text-center text-sm text-slate-500">
              No notes authored yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {notes.map((n) => {
                const p = Array.isArray(n.participants) ? n.participants[0] : n.participants;
                return (
                  <Link key={n.id} href={`/notes/${n.id}`} className="block px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">
                        {p?.full_name ?? "—"} · {formatDate(n.created_at)}
                      </span>
                      <span className={n.status === "approved" ? "badge-green" : n.status === "pending" ? "badge-yellow" : "badge-slate"}>
                        {n.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2">{n.note_text}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
          <AlertCircle className="w-3.5 h-3.5" /> Only owners and managers can edit staff roles.
        </div>
      )}
    </div>
  );
}

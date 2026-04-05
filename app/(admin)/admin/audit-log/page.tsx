import { createAdminSupabase } from "@/lib/supabase/admin";

export default async function AuditLogPage() {
  const sb = createAdminSupabase();
  const { data: logs } = await sb
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const ACTION_COLOR: Record<string, string> = {
    reset_password: "text-blue-400", magic_link: "text-teal-400",
    make_admin: "text-purple-400", remove_admin: "text-amber-400",
    disable: "text-red-400", enable: "text-emerald-400",
    change_plan: "text-blue-300", extend_trial: "text-teal-300",
    delete_org: "text-red-500", set_password: "text-amber-300",
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">Audit Log</h1>
        <p className="text-slate-400 text-sm mt-0.5">Every admin action recorded · Last 100 entries</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {!logs?.length ? (
          <div className="py-16 text-center text-slate-500 text-sm">No admin actions recorded yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/30">
                {["Time", "Admin", "Action", "Target", "Details"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{log.admin_email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono font-semibold ${ACTION_COLOR[log.action] ?? "text-slate-300"}`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-xs text-slate-400">{log.target_type ?? "—"}</span>
                      {log.target_id && <p className="text-[10px] text-slate-600 font-mono mt-0.5">{log.target_id.slice(0, 16)}...</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {log.details && Object.keys(log.details).length > 0
                      ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(" · ")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

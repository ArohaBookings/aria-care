"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Mail, Key, Ban, CheckCircle, Loader2, ChevronDown, Shield, User, RefreshCw } from "lucide-react";

interface UserRow {
  id: string; email: string; full_name: string; role: string;
  is_active: boolean; created_at: string;
  organisations: { name: string; subscription_tier: string } | null;
}

const PLAN_BADGE: Record<string, string> = {
  trial: "bg-slate-700 text-slate-300",
  starter: "bg-teal-900/50 text-teal-300",
  growth: "bg-blue-900/50 text-blue-300",
  business: "bg-purple-900/50 text-purple-300",
};
const ROLE_BADGE: Record<string, string> = {
  owner: "bg-amber-900/50 text-amber-300",
  coordinator: "bg-blue-900/50 text-blue-300",
  support_worker: "bg-slate-700 text-slate-400",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionUser, setActionUser] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState("");
  const [toast, setToast] = useState({ msg: "", type: "ok" });
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);

  const showToast = (msg: string, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "ok" }), 4000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  const doAction = async (action: string, userId: string, extra: Record<string, unknown> = {}) => {
    setActionLoading(action + userId);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId, ...extra }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message ?? "Action completed");
      if (data.link) {
        await navigator.clipboard.writeText(data.link);
        showToast("Magic link copied to clipboard!");
      }
      fetchUsers();
    } else {
      showToast("Error: " + (data.error ?? "Unknown error"), "err");
    }
    setActionLoading("");
    setActionUser(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Users</h1>
          <p className="text-slate-400 text-sm mt-0.5">{users.length} users</p>
        </div>
        <button onClick={fetchUsers} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 px-3 py-2 rounded-xl hover:border-slate-600 transition-all">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {toast.msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm border ${toast.type === "err" ? "bg-red-900/30 border-red-500/30 text-red-300" : "bg-teal-900/30 border-teal-500/30 text-teal-300"}`}>
          {toast.msg}
        </div>
      )}

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or email..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50 transition-all"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/30">
                {["User", "Organisation", "Role", "Plan", "Status", "Joined", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-500 mx-auto" />
                </td></tr>
              ) : users.map(user => (
                <tr key={user.id} className={`hover:bg-slate-800/30 transition-colors group ${!user.is_active ? "opacity-40" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {(user.full_name?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-100">{user.full_name || "—"}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-300">{user.organisations?.name ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_BADGE[user.role] ?? "bg-slate-700 text-slate-400"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PLAN_BADGE[user.organisations?.subscription_tier ?? "trial"]}`}>
                      {user.organisations?.subscription_tier ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${user.is_active ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-300"}`}>
                      {user.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-500">{new Date(user.created_at).toLocaleDateString("en-AU")}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        onClick={() => setActionUser(actionUser === user.id ? null : user.id)}
                        className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs border border-slate-700 px-2.5 py-1.5 rounded-lg hover:border-slate-600 transition-all"
                      >
                        Actions <ChevronDown className="w-3 h-3" />
                      </button>
                      {actionUser === user.id && (
                        <div className="absolute right-0 top-9 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 w-56 animate-in fade-in slide-in-from-top-2 duration-150">
                          <div className="px-3 py-1.5 border-b border-slate-700 mb-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">User Actions</p>
                          </div>
                          {[
                            { icon: Mail, label: "Send password reset email", action: "reset_password" },
                            { icon: Key, label: "Generate magic link", action: "magic_link" },
                            { icon: Shield, label: "Grant admin access", action: "make_admin" },
                            { icon: User, label: "Revoke admin access", action: "remove_admin" },
                          ].map(({ icon: Icon, label, action }) => (
                            <button
                              key={action}
                              onClick={() => doAction(action, user.id, { email: user.email })}
                              disabled={!!actionLoading}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                            >
                              {actionLoading === action + user.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Icon className="w-3.5 h-3.5 text-slate-400" />}
                              {label}
                            </button>
                          ))}
                          <div className="border-t border-slate-700 mt-1 pt-1">
                            {/* Manual password set */}
                            <div className="px-4 py-2">
                              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Set password manually</p>
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  value={showPasswordFor === user.id ? newPassword : ""}
                                  onFocus={() => setShowPasswordFor(user.id)}
                                  onChange={e => setNewPassword(e.target.value)}
                                  placeholder="New password..."
                                  className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50"
                                />
                                <button
                                  onClick={() => { doAction("set_password", user.id, { password: newPassword }); setNewPassword(""); setShowPasswordFor(null); }}
                                  disabled={!newPassword || newPassword.length < 6}
                                  className="text-xs bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white px-2 py-1 rounded-lg transition-colors"
                                >
                                  Set
                                </button>
                              </div>
                            </div>
                            <button
                              onClick={() => doAction(user.is_active ? "disable" : "enable", user.id)}
                              disabled={!!actionLoading}
                              className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${user.is_active ? "text-red-400 hover:bg-red-500/10" : "text-emerald-400 hover:bg-emerald-500/10"}`}
                            >
                              {user.is_active ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              {user.is_active ? "Disable account" : "Enable account"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && users.length === 0 && (
          <div className="py-16 text-center text-slate-500 text-sm">No users found matching your search</div>
        )}
      </div>
    </div>
  );
}

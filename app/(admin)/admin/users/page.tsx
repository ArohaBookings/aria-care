"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Key, Ban, CheckCircle, Loader2, ChevronDown, Shield, User, RefreshCw, Copy, Wrench, CreditCard, Gauge, AlertTriangle, BarChart3, Clock } from "lucide-react";

interface UserRow {
  id: string; organisation_id: string; email: string; full_name: string; role: string;
  account_type?: string;
  is_active: boolean; created_at: string;
  profile_missing?: boolean;
  force_password_change?: boolean;
  password_reset_required_at?: string | null;
  last_admin_password_reset_at?: string | null;
  solo_usage_reset_at?: string | null;
  auth?: {
    email_confirmed: boolean;
    last_sign_in_at?: string | null;
    banned_until?: string | null;
  } | null;
  usage?: {
    total_solo_notes: number;
    solo_notes_month: number;
    copied_month: number;
    submitted_month: number;
    last_note_at: string | null;
  };
  organisations: {
    name: string;
    subscription_tier: string;
    subscription_status?: string;
    product_mode?: string;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    solo_note_limit_override?: number | null;
    admin_plan_override_until?: string | null;
    billing_status_checked_at?: string | null;
  } | null;
}

const PLAN_BADGE: Record<string, string> = {
  trial: "bg-slate-700 text-slate-300",
  starter: "bg-teal-900/50 text-teal-300",
  growth: "bg-blue-900/50 text-blue-300",
  business: "bg-purple-900/50 text-purple-300",
  solo_free: "bg-slate-700 text-slate-300",
  solo: "bg-cyan-900/50 text-cyan-300",
  solo_pro: "bg-emerald-900/50 text-emerald-300",
};
const ROLE_BADGE: Record<string, string> = {
  owner: "bg-amber-900/50 text-amber-300",
  coordinator: "bg-blue-900/50 text-blue-300",
  support_worker: "bg-slate-700 text-slate-400",
};

function formatLastLogin(value?: string | null) {
  if (!value) return "Never signed in";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown login time";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatLastNote(value?: string | null) {
  if (!value) return "No stories yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Story time unknown";
  return `Last story ${new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(date)}`;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionUser, setActionUser] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState("");
  const [toast, setToast] = useState({ msg: "", type: "ok" });
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("solo_free");
  const [customLimit, setCustomLimit] = useState("");
  const [grantDays, setGrantDays] = useState("");

  const totalStoriesMonth = users.reduce((sum, user) => sum + (user.usage?.solo_notes_month ?? 0), 0);
  const totalStories = users.reduce((sum, user) => sum + (user.usage?.total_solo_notes ?? 0), 0);
  const paidSoloUsers = users.filter(user => ["solo", "solo_pro"].includes(user.organisations?.subscription_tier ?? "")).length;
  const neverLoggedIn = users.filter(user => !user.auth?.last_sign_in_at).length;

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
      if (data.tempPassword) {
        setTempPassword({ email: extra.email as string, password: data.tempPassword });
        await navigator.clipboard.writeText(data.tempPassword);
        showToast("Temporary password copied. User must change it on-screen.");
      }
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
          <p className="text-slate-400 text-sm mt-0.5">{users.length} users with account controls, usage and billing status</p>
        </div>
        <button onClick={fetchUsers} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 px-3 py-2 rounded-xl hover:border-slate-600 transition-all">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Stories this month", value: totalStoriesMonth, icon: BarChart3, tone: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20" },
          { label: "Total stories", value: totalStories, icon: Gauge, tone: "text-teal-300 bg-teal-400/10 border-teal-400/20" },
          { label: "Paid Solo users", value: paidSoloUsers, icon: CreditCard, tone: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
          { label: "Never logged in", value: neverLoggedIn, icon: Clock, tone: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${tone}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="font-display text-2xl font-bold text-white">{value.toLocaleString()}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {toast.msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm border ${toast.type === "err" ? "bg-red-900/30 border-red-500/30 text-red-300" : "bg-teal-900/30 border-teal-500/30 text-teal-300"}`}>
          {toast.msg}
        </div>
      )}

      {tempPassword && (
        <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-200">Temporary password generated for {tempPassword.email}</p>
              <p className="mt-1 text-xs text-amber-100/80">Shown once. The user will be forced to choose their own password immediately after login.</p>
              <code className="mt-3 block rounded-xl border border-amber-500/30 bg-slate-950 px-3 py-2 text-sm text-amber-100">{tempPassword.password}</code>
            </div>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(tempPassword.password);
                showToast("Temporary password copied");
              }}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/10"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
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
          <table className="w-full min-w-[1120px]">
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
                        <div className="mt-1 flex flex-wrap gap-1">
                          {user.profile_missing && <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-300">Missing profile</span>}
                          {user.force_password_change && <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-300">Password change</span>}
                        </div>
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
                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PLAN_BADGE[user.organisations?.subscription_tier ?? "trial"]}`}>
                        {user.organisations?.subscription_tier ?? "—"}
                      </span>
                      {user.organisations?.subscription_status && (
                        <p className="text-[10px] text-slate-500">{user.organisations.subscription_status}</p>
                      )}
                      {user.organisations?.stripe_subscription_id ? (
                        <p className="text-[10px] text-emerald-300">Stripe subscription linked</p>
                      ) : user.organisations?.stripe_customer_id ? (
                        <p className="text-[10px] text-amber-300">Stripe customer only</p>
                      ) : (
                        <p className="text-[10px] text-slate-600">No Stripe record</p>
                      )}
                      <p className="text-[10px] text-cyan-300">
                        Stories {user.usage?.solo_notes_month ?? 0}/mo · {user.usage?.total_solo_notes ?? 0} total
                      </p>
                      <p className="text-[10px] text-slate-600">{formatLastNote(user.usage?.last_note_at)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${user.is_active && !user.auth?.banned_until ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-300"}`}>
                        {user.is_active && !user.auth?.banned_until ? "Active" : "Disabled"}
                      </span>
                      <span className={`text-[10px] ${user.auth?.last_sign_in_at ? "text-slate-500" : "text-amber-300"}`}>
                        {user.auth?.last_sign_in_at ? `Last login ${formatLastLogin(user.auth.last_sign_in_at)}` : "Never signed in"}
                      </span>
                    </div>
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
                        <div className="absolute right-0 top-9 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 w-80 animate-in fade-in slide-in-from-top-2 duration-150">
                          <div className="px-3 py-1.5 border-b border-slate-700 mb-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">User Actions</p>
                          </div>
                          {[
                            { icon: Wrench, label: "Repair login/profile", action: "repair_account" },
                            { icon: Key, label: "Reset password — no email", action: "reset_password_in_app" },
                            { icon: AlertTriangle, label: "Force password change", action: "force_password_change" },
                            { icon: CheckCircle, label: "Clear password prompt", action: "clear_password_change" },
                            { icon: Shield, label: "Grant admin access", action: "make_admin" },
                            { icon: User, label: "Revoke admin access", action: "remove_admin" },
                            { icon: CheckCircle, label: "Grant Solo access", action: "grant_solo" },
                            { icon: CheckCircle, label: "Grant Solo Pro access", action: "grant_solo_pro" },
                            { icon: RefreshCw, label: "Return to Free Solo", action: "grant_solo_free" },
                            { icon: Gauge, label: "Reset Solo usage this month", action: "reset_solo_usage" },
                            { icon: CreditCard, label: "Sync Stripe billing", action: "sync_stripe" },
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
                            <div className="px-4 py-2">
                              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Grant any plan</p>
                              <div className="grid grid-cols-2 gap-1.5">
                                <select
                                  value={selectedPlan}
                                  onChange={e => setSelectedPlan(e.target.value)}
                                  className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50"
                                >
                                  <option value="solo_free">Free Solo</option>
                                  <option value="solo">Solo</option>
                                  <option value="solo_pro">Solo Pro</option>
                                  <option value="trial">Provider Trial</option>
                                  <option value="starter">Starter</option>
                                  <option value="growth">Growth</option>
                                  <option value="business">Business</option>
                                </select>
                                <input
                                  type="number"
                                  min="1"
                                  value={grantDays}
                                  onChange={e => setGrantDays(e.target.value)}
                                  placeholder="Days optional"
                                  className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50"
                                />
                              </div>
                              <div className="mt-1.5 flex gap-1.5">
                                <input
                                  type="number"
                                  min="1"
                                  value={customLimit}
                                  onChange={e => setCustomLimit(e.target.value)}
                                  placeholder="Solo note limit optional"
                                  className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50"
                                />
                                <button
                                  onClick={() => doAction("grant_plan", user.id, {
                                    email: user.email,
                                    plan: selectedPlan,
                                    days: grantDays ? Number(grantDays) : null,
                                    customLimit: customLimit ? Number(customLimit) : null,
                                    reason: "Manual super admin grant",
                                  })}
                                  disabled={!!actionLoading}
                                  className="text-xs bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white px-2 py-1 rounded-lg transition-colors"
                                >
                                  Grant
                                </button>
                              </div>
                              <p className="mt-1.5 text-[10px] text-slate-500">Admin grants bypass Stripe by design. Normal paid trials still require a card.</p>
                            </div>
                            {/* Manual password set */}
                            <div className="px-4 py-2">
                              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Set temporary password</p>
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
                                  onClick={() => { doAction("set_password", user.id, { email: user.email, password: newPassword, forceChange: true }); setNewPassword(""); setShowPasswordFor(null); }}
                                  disabled={!newPassword || newPassword.length < 8}
                                  className="text-xs bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white px-2 py-1 rounded-lg transition-colors"
                                >
                                  Set
                                </button>
                              </div>
                              <p className="mt-1.5 text-[10px] text-slate-500">Minimum 8 chars. User is forced to change it on-screen.</p>
                            </div>
                            <button
                              onClick={() => doAction(user.is_active ? "disable" : "enable", user.id, { email: user.email })}
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

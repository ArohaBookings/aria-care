"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, ChevronDown, RefreshCw, Loader2, Building2, ExternalLink, DollarSign, Users } from "lucide-react";

interface OrgRow {
  id: string; name: string; contact_email: string; subscription_tier: string;
  subscription_status: string; participant_limit: number; trial_ends_at: string;
  created_at: string; stripe_customer_id: string | null;
  user_count?: number; participant_count?: number;
}

const PLAN_PRICES: Record<string, number> = { starter: 149, growth: 349, business: 699 };
const PLAN_BADGE: Record<string, string> = {
  trial: "bg-slate-700 text-slate-300",
  starter: "bg-teal-900/50 text-teal-300",
  growth: "bg-blue-900/50 text-blue-300",
  business: "bg-purple-900/50 text-purple-300",
};

export default function AdminOrgsPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionOrg, setActionOrg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState("");
  const [toast, setToast] = useState({ msg: "", type: "ok" });
  const [changingPlan, setChangingPlan] = useState<string | null>(null);

  const showToast = (msg: string, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "ok" }), 4000);
  };

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/organisations?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setOrgs(data.organisations ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchOrgs, 300);
    return () => clearTimeout(t);
  }, [fetchOrgs]);

  const doAction = async (action: string, orgId: string, extra: Record<string, unknown> = {}) => {
    setActionLoading(action + orgId);
    const res = await fetch("/api/admin/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, orgId, ...extra }),
    });
    const data = await res.json();
    if (res.ok) { showToast(data.message ?? "Done"); fetchOrgs(); }
    else showToast("Error: " + (data.error ?? "Unknown"), "err");
    setActionLoading("");
    setActionOrg(null);
    setChangingPlan(null);
  };

  const totalMrr = orgs.filter(o => o.subscription_status === "active").reduce((s, o) => s + (PLAN_PRICES[o.subscription_tier] ?? 0), 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Organisations</h1>
          <p className="text-slate-400 text-sm mt-0.5">{orgs.length} orgs · <span className="text-emerald-400 font-semibold">${totalMrr.toLocaleString()} MRR</span></p>
        </div>
        <button onClick={fetchOrgs} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 px-3 py-2 rounded-xl hover:border-slate-600 transition-all">
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
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organisations..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50 transition-all" />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center"><Loader2 className="w-5 h-5 animate-spin text-slate-500 mx-auto" /></div>
        ) : orgs.map(org => (
          <div key={org.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 flex-shrink-0">
                  {org.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-100">{org.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PLAN_BADGE[org.subscription_tier]}`}>
                      {org.subscription_tier}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${org.subscription_status === "active" ? "bg-emerald-900/50 text-emerald-300" : org.subscription_status === "trialing" ? "bg-teal-900/50 text-teal-300" : "bg-red-900/50 text-red-300"}`}>
                      {org.subscription_status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{org.contact_email ?? "No email"}</p>
                  <div className="flex items-center gap-4 mt-2">
                    {org.user_count !== undefined && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Users className="w-3 h-3" /> {org.user_count} staff
                      </span>
                    )}
                    {org.participant_count !== undefined && (
                      <span className="text-xs text-slate-500">{org.participant_count}/{org.participant_limit} participants</span>
                    )}
                    <span className="text-xs text-slate-600">Joined {new Date(org.created_at).toLocaleDateString("en-AU")}</span>
                    {org.subscription_tier !== "trial" && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                        <DollarSign className="w-3 h-3" />{PLAN_PRICES[org.subscription_tier]}/mo
                      </span>
                    )}
                    {org.subscription_tier === "trial" && org.trial_ends_at && (
                      <span className="text-xs text-amber-400">Trial ends {new Date(org.trial_ends_at).toLocaleDateString("en-AU")}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Change plan inline */}
                {changingPlan === org.id ? (
                  <div className="flex items-center gap-2">
                    <select
                      className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                      onChange={e => e.target.value && doAction("change_plan", org.id, { plan: e.target.value, participantLimit: PLAN_PRICES[e.target.value] ? (e.target.value === "starter" ? 10 : e.target.value === "growth" ? 30 : 75) : 10 })}
                      defaultValue=""
                    >
                      <option value="" disabled>Select plan...</option>
                      {["trial", "starter", "growth", "business"].map(p => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}{PLAN_PRICES[p] ? ` — $${PLAN_PRICES[p]}/mo` : ""}</option>
                      ))}
                    </select>
                    <button onClick={() => setChangingPlan(null)} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setChangingPlan(org.id)} className="text-xs border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 px-3 py-1.5 rounded-lg transition-all">
                    Change plan
                  </button>
                )}

                <div className="relative">
                  <button onClick={() => setActionOrg(actionOrg === org.id ? null : org.id)}
                    className="flex items-center gap-1 text-xs border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 px-3 py-1.5 rounded-lg transition-all">
                    More <ChevronDown className="w-3 h-3" />
                  </button>
                  {actionOrg === org.id && (
                    <div className="absolute right-0 top-9 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 w-52">
                      {[
                        { label: "Extend trial 14 days", action: "extend_trial" },
                        { label: "Grant 30-day free access", action: "grant_free_month" },
                        { label: "Reset participant count", action: "reset_participants" },
                        { label: "Send welcome email", action: "send_welcome" },
                      ].map(({ label, action }) => (
                        <button key={action} onClick={() => doAction(action, org.id)}
                          disabled={!!actionLoading}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors text-left">
                          {actionLoading === action + org.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                          {label}
                        </button>
                      ))}
                      {org.stripe_customer_id && (
                        <a href={`https://dashboard.stripe.com/customers/${org.stripe_customer_id}`} target="_blank" rel="noopener noreferrer"
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-teal-400 hover:bg-slate-700 transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" /> View in Stripe
                        </a>
                      )}
                      <div className="border-t border-slate-700 mt-1 pt-1">
                        <button onClick={() => doAction("delete_org", org.id)}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors">
                          Delete organisation
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {!loading && orgs.length === 0 && (
          <div className="py-16 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-700" />
            <p className="text-sm">No organisations found</p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Loader2, ExternalLink, TrendingUp, AlertTriangle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AlertDialog from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast";

interface OrgData {
  subscription_tier: string;
  subscription_status: string;
  trial_ends_at: string | null;
  participant_limit: number;
  stripe_customer_id: string | null;
  product_mode?: string | null;
  billing_country?: string | null;
  solo_note_limit_override?: number | null;
}

const PLAN_CONFIG: Record<string, { name: string; price: number; participants: number; notes?: number; color: string }> = {
  trial:     { name: "Free Trial",        price: 0,   participants: 10, color: "slate" },
  starter:   { name: "Starter",           price: 149, participants: 10, color: "teal" },
  growth:    { name: "Growth",            price: 349, participants: 30, color: "blue" },
  business:  { name: "Business",          price: 699, participants: 75, color: "purple" },
  solo_free: { name: "Free Solo",         price: 0,   participants: 0, notes: 3, color: "slate" },
  solo:      { name: "Aria Care Solo",    price: 19,  participants: 0, notes: 125, color: "teal" },
  solo_pro:  { name: "Aria Care Solo Pro",price: 29,  participants: 0, notes: 400, color: "blue" },
};

function BillingPageInner() {
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "true";
  const reason = searchParams.get("reason");
  const toast = useToast();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [monthlyNoteCount, setMonthlyNoteCount] = useState(0);
  const [isSoloBilling, setIsSoloBilling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase.from("users").select("organisation_id, account_type, solo_usage_reset_at").eq("id", user.id).single();
      const { data: orgData } = await supabase.from("organisations").select("*").eq("id", profile?.organisation_id).single();
      const { count } = await supabase.from("participants").select("*", { count: "exact", head: true }).eq("organisation_id", profile?.organisation_id).eq("status", "active");
      const soloMode = profile?.account_type === "solo" || orgData?.product_mode === "solo" || orgData?.subscription_tier?.startsWith("solo");
      const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
      const countFrom = profile?.solo_usage_reset_at && new Date(profile.solo_usage_reset_at) > new Date(monthStart)
        ? profile.solo_usage_reset_at
        : monthStart;
      const { count: soloNotes } = soloMode
        ? await supabase.from("solo_notes").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", countFrom)
        : { count: 0 };
      setOrg(orgData);
      setParticipantCount(count ?? 0);
      setMonthlyNoteCount(soloNotes ?? 0);
      setIsSoloBilling(soloMode);
      setLoading(false);
    })();
  }, []);

  const handlePortal = async () => {
    setPortalLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    setPortalLoading(false);
  };

  const handleCancelTrial = async () => {
    setCancelling(true);
    try {
      const supabase = createClient();
      const res = await fetch("/api/stripe/cancel-trial", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      toast.success("Subscription cancelled", "You won't be charged. Your data remains safe.");
      setCancelOpen(false);
      // Refetch
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase.from("users").select("organisation_id").eq("id", user.id).single();
      const { data: orgData } = await supabase.from("organisations").select("*").eq("id", profile?.organisation_id).single();
      setOrg(orgData);
    } catch (e) {
      toast.error("Could not cancel", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const handleUpgrade = async (plan: string) => {
    setUpgradeLoading(plan);
    const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    setUpgradeLoading("");
  };

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  const currentPlan = PLAN_CONFIG[org?.subscription_tier ?? "trial"];
  const trialDaysLeft = org?.trial_ends_at ? Math.max(0, Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / 86400000)) : 0;
  const isTrialing = org?.subscription_tier === "trial";
  const onStripeTrial = org?.subscription_status === "trialing";
  const trialEndDate = org?.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const usagePct = Math.round((participantCount / Math.max(currentPlan.participants, 1)) * 100);
  const nextUsagePlan = org?.subscription_tier === "growth" ? "business" : "growth";
  const noteLimit = org?.solo_note_limit_override ?? currentPlan.notes ?? 3;
  const soloUsagePct = Math.round((monthlyNoteCount / Math.max(noteLimit, 1)) * 100);

  if (isSoloBilling) {
    const country = org?.billing_country === "NZ" ? "NZ" : "AU";
    const soloPlans = [
      { key: "solo", name: "Aria Care Solo", price: country === "NZ" ? 21 : 19, currency: country === "NZ" ? "NZ$" : "AU$", notes: 125, features: ["125 notes/month", "Progress notes, handovers and incident drafts", "Saved private history", "Copy into ShiftCare, Lumary, Brevity or any platform"] },
      { key: "solo_pro", name: "Aria Care Solo Pro", price: country === "NZ" ? 32 : 29, currency: country === "NZ" ? "NZ$" : "AU$", notes: 400, features: ["400 notes/month", "Advanced templates", "Risk and support summaries", "Better history and priority improvements"] },
    ];

    return (
      <div className="p-4 sm:p-6 max-w-5xl space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Solo Billing</h2>
          <p className="text-sm text-slate-500 mt-1">Free Solo needs no card. Paid Solo starts with a card-secured 14-day trial.</p>
        </div>

        {reason === "solo-note-limit" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">You&apos;ve used your free Solo notes this month</p>
              <p className="text-sm text-amber-800 mt-1">Upgrade to keep creating structured, copy-ready notes.</p>
            </div>
          </div>
        )}

        {onStripeTrial && trialEndDate && (
          <div className="rounded-2xl border border-aria-200 bg-aria-50 p-5">
            <p className="font-semibold text-aria-900">You&apos;re on a Solo trial — {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} remaining</p>
            <p className="text-sm text-aria-800 mt-1">Your first charge will be on <strong>{trialEndDate.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</strong>.</p>
            <button onClick={() => setCancelOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-800">
              <X className="w-3.5 h-3.5" /> Cancel trial
            </button>
          </div>
        )}

        <div className="card p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="section-title mb-1">Current Plan</p>
              <div className="flex items-center gap-3">
                <p className="font-display text-3xl font-bold text-slate-900">{currentPlan.name}</p>
                <span className={`badge ${org?.subscription_status === "active" ? "badge-green" : org?.subscription_status === "trialing" ? "badge-teal" : "badge-yellow"}`}>
                  {org?.subscription_status === "trialing" ? `Trial · ${trialDaysLeft}d left` : org?.subscription_status ?? "active"}
                </span>
              </div>
              {currentPlan.price > 0 && <p className="text-2xl font-bold text-slate-700 mt-1">{country === "NZ" ? "NZ$" : "AU$"}{country === "NZ" && org?.subscription_tier === "solo" ? 21 : country === "NZ" && org?.subscription_tier === "solo_pro" ? 32 : currentPlan.price}<span className="text-sm font-normal text-slate-500">/month</span></p>}
            </div>
            {org?.stripe_customer_id && (
              <button onClick={handlePortal} disabled={portalLoading} className="btn-secondary">
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Manage billing
              </button>
            )}
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-600">Solo notes this month</p>
              <p className="text-sm font-bold text-slate-900">{monthlyNoteCount} / {noteLimit}</p>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${soloUsagePct >= 90 ? "bg-red-500" : soloUsagePct >= 70 ? "bg-amber-400" : "bg-aria-500"}`} style={{ width: `${Math.min(soloUsagePct, 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {soloPlans.map(plan => {
            const isCurrent = org?.subscription_tier === plan.key;
            return (
              <div key={plan.key} className={`card p-5 flex flex-col ${isCurrent ? "border-aria-300 bg-aria-50/30" : ""}`}>
                <p className="font-display font-bold text-slate-900">{plan.name}</p>
                <p className="font-display text-3xl font-bold text-slate-900 mt-2">{plan.currency}{plan.price}<span className="text-sm font-normal text-slate-500">/mo</span></p>
                <p className="text-xs text-aria-600 font-semibold mt-1">{plan.notes} notes/month · 14-day trial with card</p>
                <ul className="space-y-1.5 flex-1 my-4">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle className="w-3.5 h-3.5 text-aria-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="badge-teal justify-center py-2.5 rounded-xl">Current plan</div>
                ) : (
                  <button onClick={() => handleUpgrade(plan.key)} disabled={upgradeLoading === plan.key} className="btn-primary justify-center py-2.5">
                    {upgradeLoading === plan.key ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Start {plan.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="card p-5 bg-slate-50/50">
          <p className="text-sm text-slate-600">
            Create in Aria Care, review, then copy into ShiftCare, Lumary, Brevity, CareMaster or whatever your provider uses.
          </p>
        </div>

        <AlertDialog
          open={cancelOpen}
          destructive
          loading={cancelling}
          title="Cancel your Solo trial?"
          description="Your paid Solo subscription will be cancelled and your account will return to Free Solo. Your saved notes remain available."
          confirmLabel="Yes, cancel trial"
          cancelLabel="Keep trial"
          onConfirm={handleCancelTrial}
          onCancel={() => setCancelOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <h2 className="font-display text-2xl font-bold text-slate-900">Billing</h2>

      {expired && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-red-900 mb-1">Your free trial has expired</p>
            <p className="text-sm text-red-700">
              Upgrade to any paid plan below to restore full access to your dashboard, voice notes, participants, and compliance tracking. Your data is safe — nothing has been deleted.
            </p>
          </div>
        </div>
      )}

      {onStripeTrial && trialEndDate && (
        <div className="rounded-2xl border border-aria-200 bg-aria-50 p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-aria-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-aria-700" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-aria-900 mb-1">
              You&apos;re on a free trial — {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} remaining
            </p>
            <p className="text-sm text-aria-800">
              Your first charge will be on <strong>{trialEndDate.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</strong>.
              You will <strong>not be charged</strong> if you cancel before then.
            </p>
            <button
              onClick={() => setCancelOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Cancel trial
            </button>
          </div>
        </div>
      )}

      {reason === "note-limit" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-950 mb-1">Your team has reached its AI note generation limit</p>
            <p className="text-sm text-amber-800">
              Upgrade to unlock more voice notes, faster documentation throughput, and more room for busy teams.
            </p>
          </div>
        </div>
      )}

      {reason === "participant-limit" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-950 mb-1">You have used every participant slot on this plan</p>
            <p className="text-sm text-amber-800">
              Upgrade before adding more participants so your team can keep onboarding without workarounds.
            </p>
          </div>
        </div>
      )}

      {!isTrialing && !onStripeTrial && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <strong className="text-slate-900">Note:</strong> Upgrading mid-cycle is automatically prorated — you&apos;ll only be charged for the remaining days.
        </div>
      )}

      {/* Current plan */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="section-title mb-1">Current Plan</p>
            <div className="flex items-center gap-3">
              <p className="font-display text-3xl font-bold text-slate-900">{currentPlan.name}</p>
              <span className={`badge ${org?.subscription_status === "active" ? "badge-green" : org?.subscription_status === "trialing" ? "badge-teal" : "badge-yellow"}`}>
                {org?.subscription_status === "trialing" ? `Trial · ${trialDaysLeft}d left` : org?.subscription_status ?? "active"}
              </span>
            </div>
            {!isTrialing && <p className="text-2xl font-bold text-slate-700 mt-1">${currentPlan.price}<span className="text-sm font-normal text-slate-500">/month</span></p>}
          </div>
          {!isTrialing && (
            <button onClick={handlePortal} disabled={portalLoading} className="btn-secondary">
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Manage billing
            </button>
          )}
        </div>

        {/* Usage */}
        <div className="mt-5 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-600">Participant usage</p>
            <p className="text-sm font-bold text-slate-900">{participantCount} / {currentPlan.participants}</p>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-400" : "bg-aria-500"}`}
              style={{ width: `${Math.min(usagePct, 100)}%` }}
            />
          </div>
          {usagePct >= 80 && (
            <div className="flex items-center justify-between gap-3 mt-2 text-xs text-amber-700">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {usagePct >= 100 ? "You've reached your participant limit. Upgrade to add more." : `${currentPlan.participants - participantCount} spots remaining`}
              </div>
              {usagePct >= 100 && org?.subscription_tier !== "business" && (
                <button onClick={() => handleUpgrade(nextUsagePlan)} className="font-bold text-amber-800 hover:text-amber-900">
                  Upgrade now
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upgrade options */}
      {(isTrialing || org?.subscription_tier !== "business") && (
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900 mb-4">
            {isTrialing ? "Choose your plan" : "Upgrade plan"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: "starter", name: "Starter", price: 149, participants: "Up to 10", features: ["Voice-to-note", "AI document suite", "Compliance tracking", "3 staff accounts"] },
              { key: "growth",  name: "Growth",  price: 349, participants: "Up to 30", features: ["Everything in Starter", "Billing assistant", "Smart rostering", "Participant portal", "Unlimited staff"] },
              { key: "business",name: "Business",price: 699, participants: "Up to 75", features: ["Everything in Growth", "AI coordinator agent", "Audit pack generator", "API access", "Dedicated support"] },
            ].map(plan => {
              const isCurrent = org?.subscription_tier === plan.key;
              return (
                <div key={plan.key} className={`card p-5 flex flex-col ${isCurrent ? "border-aria-300 bg-aria-50/30" : ""}`}>
                  <div className="mb-3">
                    <p className="font-display font-bold text-slate-900">{plan.name}</p>
                    <p className="font-display text-2xl font-bold text-slate-900 mt-1">${plan.price}<span className="text-sm font-normal text-slate-500">/mo</span></p>
                    <p className="text-xs text-aria-600 font-semibold">{plan.participants}</p>
                  </div>
                  <ul className="space-y-1.5 flex-1 mb-4">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                        <CheckCircle className="w-3.5 h-3.5 text-aria-500 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div className="badge-teal justify-center py-2.5 rounded-xl">Current plan</div>
                  ) : (
                    <button onClick={() => handleUpgrade(plan.key)} disabled={upgradeLoading === plan.key} className="btn-primary justify-center py-2.5">
                      {upgradeLoading === plan.key ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Upgrade to {plan.name}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AlertDialog
        open={cancelOpen}
        destructive
        loading={cancelling}
        title="Cancel your trial?"
        description={
          trialEndDate
            ? `Your subscription will be cancelled immediately and you won't be charged. You'll keep read-only access until ${trialEndDate.toLocaleDateString("en-AU", { day: "numeric", month: "long" })}. Your data is never deleted — you can restart anytime.`
            : "Your subscription will be cancelled immediately. You won't be charged and your data is never deleted."
        }
        confirmLabel="Yes, cancel trial"
        cancelLabel="Keep trial"
        onConfirm={handleCancelTrial}
        onCancel={() => setCancelOpen(false)}
      />

      <div className="card p-5 bg-slate-50/50">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-aria-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-900 text-sm mb-1">ROI Calculator</p>
            <p className="text-sm text-slate-600">
              If your team has 5 support workers spending 10 hours/week on notes, that&apos;s 50 hrs/week.
              At $30/hr, that&apos;s <span className="font-bold text-slate-900">$1,500/week</span> in admin costs.
              Aria reduces this by 80% — saving you <span className="font-bold text-aria-700">$1,200/week</span>.
              That&apos;s 8x ROI on the Growth plan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-6 flex items-center justify-center h-64"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>}>
      <BillingPageInner />
    </Suspense>
  );
}

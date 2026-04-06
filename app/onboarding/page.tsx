"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Sparkles, Building2, Users, Check, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const STEPS = ["Organisation", "First Participant", "Invite Team", "Start Trial"];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [abn, setAbn] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [ndisNumber, setNdisNumber] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("support_worker");
  const [inviteSent, setInviteSent] = useState(false);

  // If the user has already completed onboarding (real org name but no
  // subscription), jump straight to the Start Trial step.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("users").select("organisation_id").eq("id", user.id).single();
      if (!profile?.organisation_id) return;
      const { data: org } = await supabase
        .from("organisations")
        .select("name, stripe_subscription_id")
        .eq("id", profile.organisation_id)
        .single();
      if (org?.name && org.name !== "My Organisation") {
        setOrgName(org.name);
        if (!org.stripe_subscription_id) setStep(3);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOrgSave = async () => {
    if (!orgName.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("users").select("organisation_id").eq("id", user!.id).single();
    await supabase.from("organisations").update({ name: orgName, abn }).eq("id", profile?.organisation_id);
    setLoading(false);
    setStep(1);
  };

  const handleParticipant = async () => {
    if (!participantName.trim()) { setStep(2); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("users").select("organisation_id").eq("id", user!.id).single();
    await supabase.from("participants").insert({
      organisation_id: profile?.organisation_id,
      full_name: participantName,
      ndis_number: ndisNumber || null,
      status: "active",
      funding_remaining_pct: 100,
    });
    setLoading(false);
    setStep(2);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) { setStep(3); return; }
    setLoading(true);
    await fetch("/api/staff/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, full_name: inviteName, role: inviteRole }),
    });
    setInviteSent(true);
    setLoading(false);
    setTimeout(() => setStep(3), 1500);
  };

  const [checkoutLoading, setCheckoutLoading] = useState("");
  const handleStartTrial = async (plan: string) => {
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || "Could not start checkout");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Checkout failed");
      setCheckoutLoading("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-hero-mesh pointer-events-none" />
      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <Image src="/logo.svg" alt="Aria" width={40} height={40} className="w-10 h-10 rounded-2xl" />
          <span className="font-display text-2xl font-bold text-slate-900">Aria</span>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < step ? "bg-aria-600 text-white" : i === step ? "bg-aria-600 text-white ring-4 ring-aria-100" : "bg-slate-200 text-slate-500"}`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 w-8 md:w-16 ${i < step ? "bg-aria-400" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        <div className="card p-8">
          {step === 0 && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-aria-50 border border-aria-100 flex items-center justify-center mb-5">
                <Building2 className="w-6 h-6 text-aria-600" />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Set up your organisation</h2>
              <p className="text-sm text-slate-500 mb-6">Tell us about your support provider business.</p>
              <div className="space-y-4">
                <div>
                  <label className="label">Organisation name <span className="text-red-500">*</span></label>
                  <input value={orgName} onChange={e => setOrgName(e.target.value)} className="input" placeholder="Sunshine Care Services" />
                </div>
                <div>
                  <label className="label">ABN (optional)</label>
                  <input value={abn} onChange={e => setAbn(e.target.value)} className="input" placeholder="12 345 678 901" />
                </div>
              </div>
              <button onClick={handleOrgSave} disabled={!orgName.trim() || loading} className="btn-primary mt-6 w-full justify-center py-3">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Continue</>}
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-aria-50 border border-aria-100 flex items-center justify-center mb-5">
                <Users className="w-6 h-6 text-aria-600" />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Add your first participant</h2>
              <p className="text-sm text-slate-500 mb-6">You can skip this and add participants later from the dashboard.</p>
              <div className="space-y-4">
                <div>
                  <label className="label">Participant name</label>
                  <input value={participantName} onChange={e => setParticipantName(e.target.value)} className="input" placeholder="Marcus Thompson" />
                </div>
                <div>
                  <label className="label">NDIS Number (optional)</label>
                  <input value={ndisNumber} onChange={e => setNdisNumber(e.target.value)} className="input" placeholder="430 123 456" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={handleParticipant} disabled={loading} className="btn-primary flex-1 justify-center py-3">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Continue</>}
                </button>
                <button onClick={() => setStep(2)} className="btn-secondary py-3 px-4">Skip</button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-aria-50 border border-aria-100 flex items-center justify-center mb-5">
                <Sparkles className="w-6 h-6 text-aria-600" />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Invite your team</h2>
              <p className="text-sm text-slate-500 mb-6">Send your first team member an invite. They&apos;ll get a signup link.</p>
              {inviteSent ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="font-semibold text-slate-900">Invite sent to {inviteEmail}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Their name</label><input value={inviteName} onChange={e => setInviteName(e.target.value)} className="input" placeholder="Jane Smith" /></div>
                    <div>
                      <label className="label">Role</label>
                      <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="input">
                        <option value="support_worker">Support Worker</option>
                        <option value="coordinator">Coordinator</option>
                      </select>
                    </div>
                  </div>
                  <div><label className="label">Email address</label><input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="input" placeholder="jane@yourorg.com.au" /></div>
                </div>
              )}
              <div className="flex gap-3 mt-6">
                <button onClick={handleInvite} disabled={loading || inviteSent} className="btn-primary flex-1 justify-center py-3">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Send invite</>}
                </button>
                <button onClick={() => setStep(3)} className="btn-secondary py-3 px-4">Skip</button>
              </div>
            </>
          )}

          {step === 3 && (
            <div>
              <div className="w-12 h-12 rounded-2xl bg-aria-50 border border-aria-100 flex items-center justify-center mb-5">
                <Sparkles className="w-6 h-6 text-aria-600" />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Start your 14-day free trial</h2>
              <p className="text-sm text-slate-500 mb-5">
                Pick a plan to start. You won&apos;t be charged until your trial ends — cancel anytime from Billing. A card is required to activate your workspace.
              </p>

              <div className="space-y-2 mb-5">
                {[
                  { key: "starter", name: "Starter", price: 149, note: "Up to 10 participants", recommended: true },
                  { key: "growth", name: "Growth", price: 349, note: "Up to 30 participants · billing assistant" },
                  { key: "business", name: "Business", price: 699, note: "Up to 75 participants · AI coordinator" },
                ].map((plan) => (
                  <button
                    key={plan.key}
                    onClick={() => handleStartTrial(plan.key)}
                    disabled={!!checkoutLoading}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      plan.recommended
                        ? "border-aria-300 bg-aria-50/40 hover:border-aria-400"
                        : "border-slate-200 hover:border-slate-300"
                    } disabled:opacity-60`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{plan.name}</p>
                          {plan.recommended && <span className="badge-teal text-[10px]">Recommended</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{plan.note}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">${plan.price}<span className="text-xs text-slate-500 font-normal">/mo</span></p>
                        {checkoutLoading === plan.key ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-aria-500 ml-auto mt-1" />
                        ) : (
                          <p className="text-[10px] text-aria-600 font-semibold">after 14-day trial</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-xs text-slate-400 text-center">
                Secured by Stripe · Cancel anytime in Settings · No charge during trial
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

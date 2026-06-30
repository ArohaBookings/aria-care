"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Check, Loader2, Mic, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ROLE_OPTIONS = [
  { key: "individual", label: "Individual support worker", desc: "I write my own notes and copy them into another system." },
  { key: "coordinator", label: "Coordinator / team leader", desc: "I support a team and review documentation." },
  { key: "provider_owner", label: "Provider / business owner", desc: "I want Aria for my organisation." },
  { key: "admin_ops", label: "Admin / operations", desc: "I manage compliance, teams, or reporting." },
  { key: "testing", label: "Just testing", desc: "I want to explore before deciding." },
];

const SOLO_PLATFORMS = ["ShiftCare", "Brevity", "Lumary", "CareMaster", "Other", "Not sure"];

type PlanKey = "solo_free" | "solo" | "solo_pro" | "starter" | "growth" | "business";

const PLAN_KEYS: PlanKey[] = ["solo_free", "solo", "solo_pro", "starter", "growth", "business"];

function isPlanKey(plan: string): plan is PlanKey {
  return PLAN_KEYS.includes(plan as PlanKey);
}

function isSoloPlan(plan: PlanKey) {
  return plan.startsWith("solo");
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const requestedPlan = searchParams.get("plan") || "starter";
  const selectedPlan: PlanKey = isPlanKey(requestedPlan) ? requestedPlan : "starter";

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roleChoice, setRoleChoice] = useState(isSoloPlan(selectedPlan) ? "individual" : "provider_owner");

  const [orgName, setOrgName] = useState("");
  const [abn, setAbn] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [ndisNumber, setNdisNumber] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("support_worker");
  const [inviteSent, setInviteSent] = useState(false);

  const [soloCountry, setSoloCountry] = useState("Australia");
  const [soloNoteType, setSoloNoteType] = useState("Progress notes");
  const [soloStyle, setSoloStyle] = useState("balanced");
  const [soloHistory, setSoloHistory] = useState("yes");
  const [soloCopies, setSoloCopies] = useState("yes");
  const [soloPlatform, setSoloPlatform] = useState("ShiftCare");
  const [checkoutLoading, setCheckoutLoading] = useState("");
  const [currentPlan, setCurrentPlan] = useState<PlanKey>(selectedPlan);

  const isSoloFlow = roleChoice === "individual";
  const steps = isSoloFlow
    ? ["About you", "Solo setup", "Choose plan"]
    : ["About you", "Organisation", "First Participant", "Invite Team", "Start Trial"];
  const planOptions = [
    { key: "solo_free" as const, group: "Solo", name: "Free Solo", price: "$0", note: "3 progress notes/month · no card · upgrade later" },
    { key: "solo" as const, group: "Solo", name: "Aria Care Solo", price: soloCountry === "New Zealand" ? "NZ$21" : "AU$19", note: "125 notes/month · all Solo note types · 14-day card trial" },
    { key: "solo_pro" as const, group: "Solo", name: "Aria Care Solo Pro", price: soloCountry === "New Zealand" ? "NZ$32" : "AU$29", note: "400 notes/month · advanced templates · 14-day card trial" },
    { key: "starter" as const, group: "Provider", name: "Starter", price: "$149", note: "Provider workspace · up to 10 participants · 14-day card trial" },
    { key: "growth" as const, group: "Provider", name: "Growth", price: "$349", note: "Provider workspace · up to 30 participants · billing assistant" },
    { key: "business" as const, group: "Provider", name: "Business", price: "$699", note: "Provider workspace · up to 75 participants · AI coordinator" },
  ];
  const activePlan = planOptions.find((plan) => plan.key === currentPlan) ?? planOptions[0];

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("organisation_id, account_type, onboarding_profile")
        .eq("id", user.id)
        .single();
      if (!profile?.organisation_id) return;

      if (profile.account_type === "solo") {
        setRoleChoice("individual");
      }

      const existing = profile.onboarding_profile as Record<string, string> | null;
      if (existing?.role_choice) setRoleChoice(existing.role_choice);
      if (existing?.country) setSoloCountry(existing.country);
      if (existing?.main_note_type) setSoloNoteType(existing.main_note_type);
      if (existing?.preferred_style) setSoloStyle(existing.preferred_style);
      if (existing?.saved_history) setSoloHistory(existing.saved_history);
      if (existing?.copies_to_platform) setSoloCopies(existing.copies_to_platform);
      if (existing?.platform) setSoloPlatform(existing.platform);

      const { data: org } = await supabase
        .from("organisations")
        .select("name, abn")
        .eq("id", profile.organisation_id)
        .single();
      if (org?.name && org.name !== "My Organisation" && org.name !== "Solo Workspace") {
        setOrgName(org.name);
      }
      if (org?.abn) setAbn(org.abn);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goBack = () => {
    setError("");
    if (step === 0) {
      router.push("/signup");
      return;
    }
    setStep((current) => Math.max(0, current - 1));
  };

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return null;
    }
    const { data: profile } = await supabase.from("users").select("organisation_id").eq("id", user.id).single();
    return { user, profile };
  };

  const saveRole = async () => {
    setError("");
    const session = await getProfile();
    if (!session) return;

    await supabase
      .from("users")
      .update({
        account_type: isSoloFlow ? "solo" : "provider",
        onboarding_profile: { role_choice: roleChoice },
      })
      .eq("id", session.user.id);

    await supabase
      .from("organisations")
      .update({
        product_mode: isSoloFlow ? "solo" : "provider",
        subscription_tier: isSoloFlow ? "solo_free" : "trial",
        subscription_status: isSoloFlow ? "active" : "trialing",
        participant_limit: isSoloFlow ? 0 : 10,
        name: isSoloFlow ? "Aria Care Solo" : (orgName || "My Organisation"),
      })
      .eq("id", session.profile?.organisation_id);

    setStep(1);
  };

  const handleOrgSave = async () => {
    if (!orgName.trim()) return;
    setLoading(true);
    setError("");
    const session = await getProfile();
    if (!session) return;

    const { error: orgError } = await supabase
      .from("organisations")
      .update({ name: orgName, abn, product_mode: "provider" })
      .eq("id", session.profile?.organisation_id);

    if (orgError) {
      setError(orgError.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    setStep(2);
  };

  const handleParticipant = async () => {
    if (!participantName.trim()) { setStep(3); return; }
    setLoading(true);
    setError("");
    const session = await getProfile();
    if (!session) return;

    const { error: participantError } = await supabase.from("participants").insert({
      organisation_id: session.profile?.organisation_id,
      full_name: participantName,
      ndis_number: ndisNumber || null,
      status: "active",
      funding_remaining_pct: 100,
    });
    if (participantError) {
      setError(participantError.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    setStep(3);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/staff/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, full_name: inviteName, role: inviteRole }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not send invite.");
      setLoading(false);
      return;
    }
    setInviteSent(true);
    setLoading(false);
    setTimeout(() => setStep(4), 1200);
  };

  const saveSoloProfile = async () => {
    const session = await getProfile();
    if (!session) return false;

    const billingCountry = soloCountry === "New Zealand" ? "NZ" : "AU";
    const onboardingProfile = {
      role_choice: roleChoice,
      country: soloCountry,
      main_note_type: soloNoteType,
      preferred_style: soloStyle,
      saved_history: soloHistory,
      copies_to_platform: soloCopies,
      platform: soloPlatform,
    };

    const { error: userError } = await supabase
      .from("users")
      .update({
        account_type: "solo",
        role: "support_worker",
        onboarding_profile: onboardingProfile,
      })
      .eq("id", session.user.id);

    if (userError) {
      setError(userError.message);
      return false;
    }

    const { error: orgError } = await supabase
      .from("organisations")
      .update({
        name: "Aria Care Solo",
        product_mode: "solo",
        subscription_tier: "solo_free",
        subscription_status: "active",
        participant_limit: 0,
        billing_country: billingCountry,
        solo_platform: soloPlatform,
        trial_ends_at: null,
      })
      .eq("id", session.profile?.organisation_id);

    if (orgError) {
      setError(orgError.message);
      return false;
    }

    return true;
  };

  const handleSelectedPlan = async () => {
    setError("");

    if (!isSoloPlan(currentPlan) && isSoloFlow) {
      setRoleChoice("provider_owner");
      setStep(1);
      setError("Provider plans need organisation setup first. Add your organisation details, then you can start that plan.");
      return;
    }

    if (isSoloPlan(currentPlan)) {
      setCheckoutLoading(currentPlan);
      const saved = await saveSoloProfile();
      if (!saved) {
        setCheckoutLoading("");
        return;
      }

      if (currentPlan === "solo_free") {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: currentPlan, country: soloCountry === "New Zealand" ? "NZ" : "AU" }),
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
        else throw new Error(data.error || "Could not start checkout");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Checkout failed");
        setCheckoutLoading("");
      }
      return;
    }

    await handleStartTrial(currentPlan);
  };

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
      setError(e instanceof Error ? e.message : "Checkout failed");
      setCheckoutLoading("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8 relative">
      <div className="absolute inset-0 bg-hero-mesh pointer-events-none" />
      <div className="w-full max-w-2xl relative z-10">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Image src="/logo.svg" alt="Aria" width={40} height={40} className="w-10 h-10 rounded-2xl" />
          <span className="font-display text-2xl font-bold text-slate-900">Aria</span>
        </div>

        <div className="flex items-center justify-between mb-8 px-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < step ? "bg-aria-600 text-white" : i === step ? "bg-aria-600 text-white ring-4 ring-aria-100" : "bg-slate-200 text-slate-500"}`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`hidden sm:block h-0.5 w-10 md:w-20 ${i < step ? "bg-aria-400" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        <div className="card p-6 sm:p-8">
          <button onClick={goBack} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6">
            <ArrowLeft className="w-3.5 h-3.5" /> {step === 0 ? "Back to signup" : "Back"}
          </button>

          {step === 0 && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-aria-50 border border-aria-100 flex items-center justify-center mb-5">
                <Sparkles className="w-6 h-6 text-aria-600" />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">What best describes you?</h2>
              <p className="text-sm text-slate-500 mb-6">We&apos;ll set up the right Aria Care experience. You can change this later.</p>
              <div className="grid grid-cols-1 gap-3">
                {ROLE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setRoleChoice(option.key)}
                    className={`text-left rounded-2xl border p-4 transition-all ${roleChoice === option.key ? "border-aria-300 bg-aria-50" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <p className="font-semibold text-slate-900">{option.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{option.desc}</p>
                  </button>
                ))}
              </div>
              <button onClick={saveRole} className="btn-primary mt-6 w-full justify-center py-3">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {isSoloFlow && step === 1 && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-aria-50 border border-aria-100 flex items-center justify-center mb-5">
                <Mic className="w-6 h-6 text-aria-600" />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Set up Aria Care Solo</h2>
              <p className="text-sm text-slate-500 mb-6">Quick, skippable defaults for support workers writing notes after shifts.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Country</label>
                  <select value={soloCountry} onChange={(e) => setSoloCountry(e.target.value)} className="input">
                    <option>Australia</option>
                    <option>New Zealand</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Main note type</label>
                  <select value={soloNoteType} onChange={(e) => setSoloNoteType(e.target.value)} className="input">
                    <option>Progress notes</option>
                    <option>Incident reports</option>
                    <option>Handovers</option>
                    <option>All of these</option>
                  </select>
                </div>
                <div>
                  <label className="label">Preferred note style</label>
                  <select value={soloStyle} onChange={(e) => setSoloStyle(e.target.value)} className="input">
                    <option value="concise">Concise</option>
                    <option value="balanced">Balanced</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </div>
                <div>
                  <label className="label">Saved history</label>
                  <select value={soloHistory} onChange={(e) => setSoloHistory(e.target.value)} className="input">
                    <option value="yes">Yes, save my history</option>
                    <option value="no">No, keep it minimal</option>
                  </select>
                </div>
                <div>
                  <label className="label">Copy into another platform?</label>
                  <select value={soloCopies} onChange={(e) => setSoloCopies(e.target.value)} className="input">
                    <option value="yes">Yes</option>
                    <option value="no">Not usually</option>
                  </select>
                </div>
                <div>
                  <label className="label">Platform</label>
                  <select value={soloPlatform} onChange={(e) => setSoloPlatform(e.target.value)} className="input">
                    {SOLO_PLATFORMS.map((platform) => <option key={platform}>{platform}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 mt-6">
                <button onClick={() => setStep(2)} className="btn-primary justify-center py-3">
                  Continue to plan <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => setStep(2)} className="btn-secondary justify-center py-3">Skip</button>
              </div>
            </>
          )}

          {isSoloFlow && step === 2 && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-aria-50 border border-aria-100 flex items-center justify-center mb-5">
                <Sparkles className="w-6 h-6 text-aria-600" />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Confirm your plan</h2>
              <p className="text-sm text-slate-500 mb-5">
                We selected <span className="font-semibold text-slate-800">{activePlan.name}</span> from signup. Change it here if you want something different.
              </p>
              <div className="space-y-2 mb-5">
                {planOptions.map((plan) => {
                  const active = currentPlan === plan.key;
                  const startedHere = selectedPlan === plan.key;
                  return (
                    <button
                      key={plan.key}
                      onClick={() => setCurrentPlan(plan.key)}
                      disabled={!!checkoutLoading}
                      className={`w-full text-left p-4 rounded-xl border transition-all disabled:opacity-60 ${
                        active ? "border-aria-300 bg-aria-50/50 shadow-sm" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{plan.name}</p>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{plan.group}</span>
                            {active && <span className="badge-teal text-[10px]">Selected</span>}
                            {!active && startedHere && <span className="text-[10px] font-semibold text-aria-600">Started here</span>}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{plan.note}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-xl font-bold text-slate-900">
                            {plan.price}<span className="text-xs font-normal text-slate-500">/mo</span>
                          </p>
                          {checkoutLoading === plan.key && <Loader2 className="w-3.5 h-3.5 animate-spin text-aria-500 ml-auto mt-1" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button onClick={handleSelectedPlan} disabled={!!checkoutLoading} className="btn-primary w-full justify-center py-3">
                {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue with {activePlan.name} <ArrowRight className="w-4 h-4" /></>}
              </button>
              <p className="text-xs text-slate-400 mt-4 text-center">
                Free Solo starts immediately. Paid plans use Stripe with card-secured 14-day trials.
              </p>
            </>
          )}

          {!isSoloFlow && step === 1 && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-aria-50 border border-aria-100 flex items-center justify-center mb-5">
                <Building2 className="w-6 h-6 text-aria-600" />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Set up your organisation</h2>
              <p className="text-sm text-slate-500 mb-6">Tell us about your support provider business.</p>
              <div className="space-y-4">
                <div>
                  <label className="label">Organisation name <span className="text-red-500">*</span></label>
                  <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="input" placeholder="Sunshine Care Services" />
                </div>
                <div>
                  <label className="label">ABN (optional)</label>
                  <input value={abn} onChange={(e) => setAbn(e.target.value)} className="input" placeholder="12 345 678 901" />
                </div>
              </div>
              <button onClick={handleOrgSave} disabled={!orgName.trim() || loading} className="btn-primary mt-6 w-full justify-center py-3">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Continue</>}
              </button>
            </>
          )}

          {!isSoloFlow && step === 2 && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-aria-50 border border-aria-100 flex items-center justify-center mb-5">
                <Users className="w-6 h-6 text-aria-600" />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Add your first participant</h2>
              <p className="text-sm text-slate-500 mb-6">You can skip this and add participants later from the dashboard.</p>
              <div className="space-y-4">
                <div>
                  <label className="label">Participant name</label>
                  <input value={participantName} onChange={(e) => setParticipantName(e.target.value)} className="input" placeholder="Marcus Thompson" />
                </div>
                <div>
                  <label className="label">NDIS Number (optional)</label>
                  <input value={ndisNumber} onChange={(e) => setNdisNumber(e.target.value)} className="input" placeholder="430 123 456" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 mt-6">
                <button onClick={handleParticipant} disabled={loading} className="btn-primary flex-1 justify-center py-3">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Continue</>}
                </button>
                <button onClick={goBack} className="btn-secondary py-3 px-4"><ArrowLeft className="w-4 h-4" /> Back</button>
                <button onClick={() => setStep(3)} className="btn-secondary py-3 px-4">Skip</button>
              </div>
            </>
          )}

          {!isSoloFlow && step === 3 && (
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
                    <div><label className="label">Their name</label><input value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="input" placeholder="Jane Smith" /></div>
                    <div>
                      <label className="label">Role</label>
                      <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="input">
                        <option value="support_worker">Support Worker</option>
                        <option value="coordinator">Coordinator</option>
                      </select>
                    </div>
                  </div>
                  <div><label className="label">Email address</label><input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="input" placeholder="jane@yourorg.com.au" /></div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 mt-6">
                <button onClick={handleInvite} disabled={loading || inviteSent || !inviteEmail.trim() || !inviteName.trim()} className="btn-primary flex-1 justify-center py-3">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Send invite</>}
                </button>
                <button onClick={goBack} className="btn-secondary py-3 px-4"><ArrowLeft className="w-4 h-4" /> Back</button>
                <button onClick={() => setStep(4)} className="btn-secondary py-3 px-4">Skip</button>
              </div>
            </>
          )}

          {!isSoloFlow && step === 4 && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-aria-50 border border-aria-100 flex items-center justify-center mb-5">
                <Sparkles className="w-6 h-6 text-aria-600" />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Confirm your plan</h2>
              <p className="text-sm text-slate-500 mb-5">
                We selected <span className="font-semibold text-slate-800">{activePlan.name}</span> from signup. You can change to any Aria plan here.
              </p>
              <div className="space-y-2 mb-5">
                {planOptions.map((plan) => {
                  const active = currentPlan === plan.key;
                  const startedHere = selectedPlan === plan.key;
                  return (
                    <button
                      key={plan.key}
                      onClick={() => setCurrentPlan(plan.key)}
                      disabled={!!checkoutLoading}
                      className={`w-full text-left p-4 rounded-xl border transition-all disabled:opacity-60 ${
                        active ? "border-aria-300 bg-aria-50/50 shadow-sm" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{plan.name}</p>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{plan.group}</span>
                            {active && <span className="badge-teal text-[10px]">Selected</span>}
                            {!active && startedHere && <span className="text-[10px] font-semibold text-aria-600">Started here</span>}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{plan.note}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-xl font-bold text-slate-900">{plan.price}<span className="text-xs text-slate-500 font-normal">/mo</span></p>
                          {checkoutLoading === plan.key && <Loader2 className="w-3.5 h-3.5 animate-spin text-aria-500 ml-auto mt-1" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button onClick={handleSelectedPlan} disabled={!!checkoutLoading} className="btn-primary w-full justify-center py-3">
                {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue with {activePlan.name} <ArrowRight className="w-4 h-4" /></>}
              </button>
              <p className="text-xs text-slate-400 mt-4 text-center">Free Solo starts immediately. Paid plans use Stripe with card-secured 14-day trials.</p>
            </>
          )}

          {error && (
            <div className="mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}

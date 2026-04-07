"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter — $149/mo (14 days free)",
  growth: "Growth — $349/mo (14 days free)",
  business: "Business — $699/mo (14 days free)",
};

const SHOW_OAUTH_OPTIONS = false;

function SignupContent() {
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "starter";
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: name,
          organisation_name: org,
          plan,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not create your account");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw new Error(signInError.message || "We created your account but could not sign you in automatically");
      }

      router.push("/onboarding");
      router.refresh();
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Could not create your account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-hero-mesh pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </Link>
        <div className="card p-8">
          <div className="flex items-center gap-2 mb-7">
            <div className="w-8 h-8 bg-aria-gradient rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-slate-900">Aria</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Start your free trial</h1>
          <p className="text-sm text-slate-500 mb-4">14 days free · Card required to activate your workspace</p>

          {PLAN_LABELS[plan] && (
            <div className="flex items-center gap-2 bg-aria-50 border border-aria-100 rounded-xl px-3 py-2 mb-5">
              <div className="w-1.5 h-1.5 rounded-full bg-aria-500" />
              <span className="text-xs font-semibold text-aria-700">{PLAN_LABELS[plan]}</span>
            </div>
          )}

          {SHOW_OAUTH_OPTIONS && (
            <>
              <button type="button" disabled={loading} className="w-full btn-secondary justify-center mb-5 py-3">
                Continue with Google
              </button>
              <div className="flex items-center gap-3 mb-5"><div className="flex-1 h-px bg-slate-100" /><span className="text-xs text-slate-400">or</span><div className="flex-1 h-px bg-slate-100" /></div>
            </>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Your name</label><input value={name} onChange={e => setName(e.target.value)} required className="input" placeholder="Jane Smith" /></div>
              <div><label className="label">Organisation</label><input value={org} onChange={e => setOrg(e.target.value)} required className="input" placeholder="Care Co." /></div>
            </div>
            <div><label className="label">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input" placeholder="jane@careorg.com.au" /></div>
            <div><label className="label">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className="input" placeholder="Min. 8 characters" /></div>
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
            </button>
            <p className="text-xs text-slate-400 text-center">You&apos;ll go straight into onboarding and Stripe checkout to activate your 14-day trial. By signing up you agree to our <Link href="/terms" className="text-aria-600">Terms</Link> and <Link href="/privacy" className="text-aria-600">Privacy Policy</Link></p>
          </form>
        </div>
        <p className="text-center text-sm text-slate-500 mt-5">
          Have an account? <Link href="/login" className="text-aria-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return <Suspense><SignupContent /></Suspense>;
}

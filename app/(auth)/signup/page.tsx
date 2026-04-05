"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter — $149/mo (14 days free)",
  growth: "Growth — $349/mo (14 days free)",
  business: "Business — $699/mo (14 days free)",
};

function SignupContent() {
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "starter";
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: name, organisation_name: org, plan_intent: plan },
      },
    });
    if (error) { setError(error.message); setLoading(false); }
    else { setDone(true); setLoading(false); }
  };

  const handleGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { plan_intent: plan } },
    });
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

          {done ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-aria-50 border border-aria-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-aria-600" />
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900 mb-2">Check your email</h3>
              <p className="text-sm text-slate-500">We sent a confirmation to <span className="font-medium text-slate-700">{email}</span>. Click the link to activate your account.</p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Start your free trial</h1>
              <p className="text-sm text-slate-500 mb-4">14 days free · No credit card required</p>

              {PLAN_LABELS[plan] && (
                <div className="flex items-center gap-2 bg-aria-50 border border-aria-100 rounded-xl px-3 py-2 mb-5">
                  <div className="w-1.5 h-1.5 rounded-full bg-aria-500" />
                  <span className="text-xs font-semibold text-aria-700">{PLAN_LABELS[plan]}</span>
                </div>
              )}

              <button onClick={handleGoogle} disabled={loading} className="w-full btn-secondary justify-center mb-5 py-3">
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>
              <div className="flex items-center gap-3 mb-5"><div className="flex-1 h-px bg-slate-100" /><span className="text-xs text-slate-400">or</span><div className="flex-1 h-px bg-slate-100" /></div>

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
                <p className="text-xs text-slate-400 text-center">By signing up you agree to our <Link href="/terms" className="text-aria-600">Terms</Link> and <Link href="/privacy" className="text-aria-600">Privacy Policy</Link></p>
              </form>
            </>
          )}
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

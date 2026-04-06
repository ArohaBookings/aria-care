"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const supabase = createClient();

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { router.push(redirect); router.refresh(); }
  };

  const handleMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/complete?redirect=${encodeURIComponent(redirect)}&type=magiclink` },
    });
    if (error) { setError(error.message); setLoading(false); }
    else { setSent(true); setLoading(false); }
  };

  const handleGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/complete?redirect=${encodeURIComponent(redirect)}` },
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
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
          <p className="text-sm text-slate-500 mb-7">Sign in to your provider account</p>

          {sent ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-aria-50 border border-aria-100 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-aria-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Check your email</h3>
              <p className="text-sm text-slate-500">Magic link sent to <span className="font-medium text-slate-700">{email}</span></p>
            </div>
          ) : (
            <>
              <button onClick={handleGoogle} disabled={loading} className="w-full btn-secondary justify-center mb-5 py-3">
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>
              <div className="flex items-center gap-3 mb-5"><div className="flex-1 h-px bg-slate-100" /><span className="text-xs text-slate-400">or</span><div className="flex-1 h-px bg-slate-100" /></div>
              <div className="flex rounded-xl border border-slate-200 p-0.5 mb-5 bg-slate-50">
                {(["password", "magic"] as const).map((m) => (
                  <button key={m} onClick={() => setMode(m)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === m ? "bg-white text-slate-900 shadow-card" : "text-slate-500"}`}>
                    {m === "password" ? "Password" : "Magic Link"}
                  </button>
                ))}
              </div>
              <form onSubmit={mode === "password" ? handlePassword : handleMagic} className="space-y-4">
                <div><label className="label">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input" placeholder="you@provider.com.au" /></div>
                {mode === "password" && <div><label className="label">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input" placeholder="••••••••" /></div>}
                {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "magic" ? "Send Magic Link" : "Sign In"}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-sm text-slate-500 mt-5">
          No account? <Link href="/signup" className="text-aria-600 font-semibold hover:underline">Start free trial</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginContent /></Suspense>;
}

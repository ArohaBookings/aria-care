"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, ArrowLeft, Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPostLoginRedirect } from "@/lib/admin-emails";

const SHOW_OAUTH_OPTIONS = false;
const SHOW_MAGIC_LINK_LOGIN = false;

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
    else {
      router.push(getPostLoginRedirect(email, redirect));
      router.refresh();
    }
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
              {SHOW_OAUTH_OPTIONS && (
                <div className="flex items-center gap-3 mb-5"><div className="flex-1 h-px bg-slate-100" /><span className="text-xs text-slate-400">or</span><div className="flex-1 h-px bg-slate-100" /></div>
              )}
              {SHOW_MAGIC_LINK_LOGIN && (
                <div className="flex rounded-xl border border-slate-200 p-0.5 mb-5 bg-slate-50">
                  {(["password", "magic"] as const).map((m) => (
                    <button key={m} onClick={() => setMode(m)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === m ? "bg-white text-slate-900 shadow-card" : "text-slate-500"}`}>
                      {m === "password" ? "Password" : "Magic Link"}
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={mode === "password" || !SHOW_MAGIC_LINK_LOGIN ? handlePassword : handleMagic} className="space-y-4">
                <div><label className="label">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input" placeholder="you@provider.com.au" /></div>
                {(mode === "password" || !SHOW_MAGIC_LINK_LOGIN) && <div><label className="label">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input" placeholder="••••••••" /></div>}
                {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "magic" && SHOW_MAGIC_LINK_LOGIN ? "Send Magic Link" : "Sign In"}
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

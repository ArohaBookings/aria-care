"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Lock, ArrowLeft, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordContent() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"request" | "update">("update");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSuccess(true);
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-hero-mesh pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
        </Link>

        <div className="card p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-aria-gradient rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-slate-900">Aria</span>
          </div>

          <div className="flex rounded-xl border border-slate-200 p-0.5 mb-5 bg-slate-50">
            <button onClick={() => { setMode("update"); setSuccess(false); setError(""); }} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === "update" ? "bg-white text-slate-900 shadow-card" : "text-slate-500"}`}>
              Set new password
            </button>
            <button onClick={() => { setMode("request"); setSuccess(false); setError(""); }} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === "request" ? "bg-white text-slate-900 shadow-card" : "text-slate-500"}`}>
              Email me a link
            </button>
          </div>

          {mode === "update" ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-aria-50 border border-aria-100 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-aria-600" />
              </div>
              <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Set a new password</h1>
              <p className="text-sm text-slate-500 mb-6">Enter and confirm your new password below.</p>
              {success ? (
                <div className="flex items-center gap-2 justify-center text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-3">
                  <Check className="w-4 h-4" /> Password updated — redirecting you…
                </div>
              ) : (
                <form onSubmit={updatePassword} className="space-y-4">
                  <div><label className="label">New password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input" placeholder="At least 8 characters" /></div>
                  <div><label className="label">Confirm password</label><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="input" placeholder="Re-enter password" /></div>
                  {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
                  <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update password"}
                  </button>
                </form>
              )}
              <p className="text-xs text-slate-400 mt-4">
                You must have arrived here from a password recovery email for this to work. If not, use the &quot;Email me a link&quot; tab.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Reset your password</h1>
              <p className="text-sm text-slate-500 mb-6">Enter your email and we&apos;ll send you a recovery link.</p>
              {success ? (
                <div className="flex items-center gap-2 justify-center text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-3">
                  <Check className="w-4 h-4" /> Check your inbox for the reset link
                </div>
              ) : (
                <form onSubmit={requestReset} className="space-y-4">
                  <div><label className="label">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input" placeholder="you@provider.com.au" /></div>
                  {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
                  <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send reset link"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}

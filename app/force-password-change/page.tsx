"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function safeRedirect(candidate: string | null) {
  return candidate?.startsWith("/") ? candidate : "/dashboard";
}

function ForcePasswordChangeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const supabase = createClient();
  const destination = safeRedirect(searchParams.get("redirect"));

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/login?redirect=${encodeURIComponent("/force-password-change")}`);
        return;
      }

      setEmail(user.email ?? "");
      setChecking(false);
    })();
  }, [router, supabase.auth]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Please choose a password with at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      const response = await fetch("/api/auth/complete-password-change", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not finish password change");

      router.replace(destination);
      router.refresh();
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Could not update your password");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-aria-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-hero-mesh pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to login
        </Link>

        <div className="card p-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-aria-100 bg-aria-50">
            <KeyRound className="h-6 w-6 text-aria-700" />
          </div>

          <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">Choose a new password</h1>
          <p className="text-sm text-slate-500 mb-5">
            An admin reset access for <span className="font-semibold text-slate-700">{email}</span>. No email verification is needed, but you must set your own password before continuing.
          </p>

          <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 flex gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-700 mt-0.5" />
            <p className="text-xs text-emerald-800">
              This keeps temporary admin passwords from becoming permanent login credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">New password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                className="input"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="label">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
                className="input"
                placeholder="Re-enter your new password"
              />
            </div>

            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Save password and continue</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ForcePasswordChangePage() {
  return (
    <Suspense>
      <ForcePasswordChangeContent />
    </Suspense>
  );
}

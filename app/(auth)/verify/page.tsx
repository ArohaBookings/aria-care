"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sparkles, Mail, ArrowLeft, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function VerifyContent() {
  const params = useSearchParams();
  const email = params.get("email") || "";
  const supabase = createClient();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const resend = async () => {
    if (!email) {
      setStatus("error");
      setErrorMsg("Missing email address — please sign up again.");
      return;
    }
    setStatus("sending");
    setErrorMsg("");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/complete?type=signup` },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-hero-mesh pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </Link>
        <div className="card p-8 text-center">
          <div className="flex items-center gap-2 justify-center mb-6">
            <div className="w-8 h-8 bg-aria-gradient rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-slate-900">Aria</span>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-aria-50 border border-aria-100 flex items-center justify-center mx-auto mb-5">
            <Mail className="w-7 h-7 text-aria-600" />
          </div>

          <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">Check your inbox</h1>
          <p className="text-sm text-slate-500 mb-6">
            We&apos;ve sent a confirmation link to{" "}
            {email ? <span className="font-semibold text-slate-700">{email}</span> : "your email"}.
            <br />
            Click it to activate your account and start your free trial.
          </p>

          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-left text-xs text-slate-600 space-y-1.5 mb-6">
            <p><strong className="text-slate-900">Not seeing it?</strong></p>
            <p>• Check your spam or promotions folder</p>
            <p>• Confirm you typed the right email address</p>
            <p>• Wait a minute — delivery can be slow</p>
          </div>

          {status === "sent" ? (
            <div className="flex items-center gap-2 justify-center text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              <Check className="w-4 h-4" /> New confirmation link sent
            </div>
          ) : (
            <button onClick={resend} disabled={status === "sending"} className="btn-secondary w-full justify-center py-3">
              {status === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Resend confirmation email"}
            </button>
          )}

          {status === "error" && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {errorMsg}
            </div>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          Wrong email? <Link href="/signup" className="text-aria-600 font-semibold hover:underline">Sign up again</Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}

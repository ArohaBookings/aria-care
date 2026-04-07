"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPostLoginRedirect } from "@/lib/admin-emails";

type CompletionState = "working" | "success" | "error";
type EmailFlowType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

const OTP_TYPES = new Set<EmailFlowType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

function AuthCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<CompletionState>("working");
  const [message, setMessage] = useState("Securing your session and preparing your workspace...");
  const redirectingRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const completeAuth = async () => {
      try {
        const flowType = searchParams.get("type");
        const errorDescription =
          searchParams.get("error_description") ??
          searchParams.get("error") ??
          new URLSearchParams(window.location.hash.replace(/^#/, "")).get("error_description") ??
          new URLSearchParams(window.location.hash.replace(/^#/, "")).get("error");

        if (errorDescription) {
          throw new Error(errorDescription);
        }

        const code = searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const tokenHash = searchParams.get("token_hash");
        if (tokenHash && flowType && OTP_TYPES.has(flowType as EmailFlowType)) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: flowType as EmailFlowType,
          });
          if (error) throw error;
        }

        for (let attempt = 0; attempt < 20; attempt += 1) {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (error) throw error;

          if (user) {
            if (redirectingRef.current) return;
            redirectingRef.current = true;

            setState("success");
            setMessage("Session ready. Sending you to the right place...");

            if (flowType === "recovery" || flowType === "invite") {
              router.replace("/reset-password");
              return;
            }

            const { data: profile } = await supabase
              .from("users")
              .select("organisation_id, organisations(name)")
              .eq("id", user.id)
              .single();

            const orgRel = (profile as unknown as { organisations: { name: string | null } | { name: string | null }[] | null } | null)?.organisations;
            const orgName = Array.isArray(orgRel) ? orgRel[0]?.name : orgRel?.name;
            const needsOnboarding = !profile?.organisation_id || !orgName || orgName === "My Organisation";
            const preferredDestination = getPostLoginRedirect(user.email, searchParams.get("redirect"));
            const destination = preferredDestination === "/admin"
              ? preferredDestination
              : needsOnboarding
                ? "/onboarding"
                : preferredDestination;

            router.replace(destination);
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        throw new Error("We couldn't finish signing you in. Please request a fresh link and try again.");
      } catch (error) {
        if (!mounted) return;
        setState("error");
        setMessage(error instanceof Error ? error.message : "Authentication failed.");
      }
    };

    void completeAuth();

    return () => {
      mounted = false;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md card p-8 text-center">
        <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border ${
          state === "error"
            ? "border-red-100 bg-red-50"
            : "border-aria-100 bg-aria-50"
        }`}>
          {state === "error" ? (
            <AlertTriangle className="h-7 w-7 text-red-600" />
          ) : state === "success" ? (
            <CheckCircle2 className="h-7 w-7 text-aria-600" />
          ) : (
            <Loader2 className="h-7 w-7 animate-spin text-aria-600" />
          )}
        </div>

        <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">
          {state === "error" ? "We hit a snag" : "Completing sign-in"}
        </h1>
        <p className="text-sm text-slate-500">{message}</p>

        {state === "error" && (
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/login" className="btn-primary justify-center">
              Back to login
            </Link>
            <Link href="/reset-password" className="btn-secondary justify-center">
              Reset password
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense>
      <AuthCompleteContent />
    </Suspense>
  );
}

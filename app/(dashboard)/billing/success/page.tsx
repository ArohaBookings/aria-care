"use client";
import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Sparkles, ArrowRight } from "lucide-react";

function SuccessInner() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan") || "your new plan";
  const sessionId = params.get("session_id");

  // Sync subscription state server-side immediately (don't wait for webhook),
  // then refresh the router so middleware sees the updated org.
  useEffect(() => {
    (async () => {
      if (sessionId) {
        try {
          await fetch("/api/stripe/confirm-checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
        } catch (e) {
          console.warn("confirm-checkout failed (webhook will catch up):", e);
        }
      }
      router.refresh();
    })();
  }, [router, sessionId]);

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <div className="card p-10 text-center relative overflow-hidden">
        {/* subtle confetti dots */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-aria-400 opacity-60"
              style={{
                top: `${(i * 37) % 80 + 5}%`,
                left: `${(i * 53) % 90 + 5}%`,
                transform: `scale(${0.6 + (i % 4) * 0.3})`,
              }}
            />
          ))}
        </div>

        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-aria-gradient flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>

          <h1 className="font-display text-3xl font-bold text-slate-900 mb-3">
            You&apos;re all set
          </h1>
          <p className="text-slate-600 mb-8 max-w-md mx-auto">
            Your Aria subscription is now active. Thank you for choosing us to power
            your team&apos;s daily support work.
          </p>

          <div className="rounded-2xl bg-aria-50 border border-aria-100 p-5 mb-8 inline-flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-aria-600" />
            <span className="font-semibold text-aria-800 capitalize">
              {plan} plan activated
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dashboard" className="btn-primary justify-center py-3 px-6">
              Go to dashboard <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/billing" className="btn-secondary justify-center py-3 px-6">
              View billing details
            </Link>
          </div>

          <p className="text-xs text-slate-400 mt-8">
            A receipt has been emailed to you. You can manage your subscription
            anytime from the billing page.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-aria-gradient p-12 md:p-16 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
          <div className="relative">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
              Give your team their evenings back.
            </h2>
            <p className="text-lg text-white/90 max-w-2xl mx-auto mb-8">
              Start your 14-day free trial. No credit card required. Setup takes 5 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-white text-aria-700 font-semibold px-7 py-3.5 rounded-xl hover:bg-slate-50 transition-colors shadow-lg"
              >
                Start free trial <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-white/20 transition-colors border border-white/20"
              >
                Sign in
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/80">
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4" /> 14-day free trial</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4" /> No credit card</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4" /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

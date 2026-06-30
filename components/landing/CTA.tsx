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
              Turn messy shift thoughts into clean notes.
            </h2>
            <p className="text-lg text-white/90 max-w-2xl mx-auto mb-8">
              Start Free Solo with no card, or launch a card-secured provider trial when your team is ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Link
                href="/signup?plan=solo_free"
                className="inline-flex items-center justify-center gap-2 bg-white text-aria-700 font-semibold px-7 py-3.5 rounded-xl hover:bg-slate-50 transition-colors shadow-lg"
              >
                Start Free Solo <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/signup?plan=growth"
                className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-white/20 transition-colors border border-white/20"
              >
                Provider team trial
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/80">
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4" /> Free Solo no card</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4" /> Paid trials collect card details</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4" /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

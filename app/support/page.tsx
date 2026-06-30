import Link from "next/link";
import { ArrowRight, CheckCircle, Copy, CreditCard, LifeBuoy, Mail, Mic, Settings, Shield, Sparkles } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata = {
  title: "Support | Aria Care",
  description: "Get help with Aria Care notes, billing, account access, privacy, and support workflows.",
};

const QUICK_HELP = [
  {
    title: "Create a better note",
    desc: "Record naturally or type rough bullet points. Include what happened, support provided, mood/presentation, risks, and follow-up if relevant.",
    icon: Mic,
  },
  {
    title: "Copy into ShiftCare or your platform",
    desc: "Use Copy full note for workplace records, or Copy handover/short version when the platform field is small.",
    icon: Copy,
  },
  {
    title: "Billing and upgrades",
    desc: "Free Solo gives 3 notes/month. Paid Solo trials require a card in Stripe before access starts.",
    icon: CreditCard,
  },
  {
    title: "Privacy-first note habits",
    desc: "Use initials or nicknames where possible, avoid unnecessary personal details, and always review before submitting.",
    icon: Shield,
  },
];

const TROUBLESHOOTING = [
  "If voice recording does not start, allow microphone access in your browser and try again.",
  "If checkout does not open, refresh the billing page and try a different browser tab.",
  "If a note looks too long, regenerate with concise detail or copy the short version.",
  "If you are locked out, email support from the same email address you use for Aria Care.",
];

export default function SupportPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-50">
      <Navbar />

      <section className="relative pt-28 pb-16">
        <div className="absolute left-[-8rem] top-24 h-72 w-72 rounded-full bg-aria-200/50 blur-3xl animate-soft-float" />
        <div className="absolute right-[-6rem] top-52 h-80 w-80 rounded-full bg-sky-200/45 blur-3xl animate-soft-float animation-delay-200" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-aria-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-aria-700 shadow-card">
              <LifeBuoy className="h-4 w-4" /> Aria Care Support
            </span>
            <h1 className="mt-6 font-display text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
              Fast help for notes, billing, accounts and privacy.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              If something gets in your way after a shift, this page should get you unstuck quickly. For direct help, email{" "}
              <a href="mailto:support@ariacare.app" className="font-bold text-aria-700 underline decoration-aria-300 underline-offset-4">
                support@ariacare.app
              </a>.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a href="mailto:support@ariacare.app?subject=Aria%20Care%20support%20request" className="btn-primary justify-center px-6 py-3 animate-sheen">
                <Mail className="h-4 w-4" /> Email support
              </a>
              <Link href="/dashboard" className="btn-secondary justify-center px-6 py-3">
                Back to dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {QUICK_HELP.map(({ title, desc, icon: Icon }, index) => (
              <div key={title} className={`card card-hover p-5 animate-fade-up-${Math.min(index + 1, 4)}`}>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-aria-50 text-aria-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-display text-lg font-bold text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-card-hover sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-aria-200">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-aria-200">Best results</p>
                <h2 className="font-display text-2xl font-bold">What to include before generating</h2>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Participant initials or nickname only",
                "Shift date and rough time",
                "Supports provided",
                "Mood or presentation observed",
                "Goals, skills or independence worked on",
                "Risks, incidents or follow-up needed",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-aria-300" />
                  <span className="text-sm text-slate-200">{item}</span>
                </div>
              ))}
            </div>

            <p className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
              Aria creates drafts only. Always review and edit before submitting to your workplace system. For incident or risk notes, follow your organisation&apos;s escalation process.
            </p>
          </div>

          <div className="card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Troubleshooting</p>
                <h2 className="font-display text-2xl font-bold text-slate-950">Quick fixes</h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {TROUBLESHOOTING.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-gradient-to-br from-aria-50 to-sky-50 p-5">
              <p className="text-sm font-bold text-slate-950">Need a human?</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Send your account email, what you were trying to do, and a screenshot if you have one. Do not include participant full names or unnecessary personal details.
              </p>
              <a href="mailto:support@ariacare.app?subject=Aria%20Care%20support%20request" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-aria-700 hover:text-aria-800">
                support@ariacare.app <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

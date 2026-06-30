import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, MapPin, Mic, ShieldCheck } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "About Aria Care | Built in New Zealand for Australia & NZ",
  description: "Aria Care is built by Leo in New Zealand to help support workers and providers turn rough shift notes into structured drafts for review and copy/paste workflows.",
  alternates: { canonical: "/about" },
};

const principles = [
  "Drafts only: review and edit before submitting to workplace systems.",
  "Works alongside ShiftCare, Lumary, Brevity, CareMaster and other provider systems.",
  "Does not replace worker judgement, provider processes or incident reporting requirements.",
  "Early product, improving from real support worker and provider feedback.",
];

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Aria Care",
  url: "https://www.ariacare.app/about",
  description: "Aria Care is built by Leo in New Zealand for support workers and providers across Australia and New Zealand.",
  mainEntity: {
    "@type": "SoftwareApplication",
    name: "Aria Care",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    areaServed: ["Australia", "New Zealand"],
    creator: { "@type": "Person", name: "Leo" },
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }} />
      <Navbar />

      <section className="relative overflow-hidden px-6 pt-28 pb-20">
        <div className="absolute inset-0 bg-hero-mesh pointer-events-none" />
        <div className="dot-pattern absolute inset-0 opacity-25 pointer-events-none" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="section-title mb-3">About Aria Care</p>
            <h1 className="font-display text-5xl font-bold tracking-tight text-slate-900 md:text-6xl">
              Built by Leo in New Zealand for support workers across Australia & NZ.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Aria Care helps support workers turn rough shift notes, bullet points or voice notes into structured drafts they can review, edit and paste into their workplace system.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup?plan=solo_free" className="btn-primary">
                Try Free Solo <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/progress-notes" className="btn-secondary">Read the progress notes guide</Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card-hover">
            <div className="rounded-2xl bg-slate-950 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-teal-200">
                  <Mic className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-teal-200">Fastest way to test</p>
                  <p className="font-display text-xl font-bold">Use one real shift note.</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                Record a quick voice note or type a few bullet points from a real shift. The question is simple: is the draft usable enough to paste into your workplace platform after review?
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              {principles.map((principle) => (
                <div key={principle} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-aria-600" />
                  <p className="text-sm leading-relaxed text-slate-700">{principle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-3">
          {[
            {
              icon: ClipboardCheck,
              title: "Why Aria exists",
              copy: "Support notes often happen when workers are tired, between visits or catching up after a long day. Aria Care exists to make the first draft faster, clearer and easier to review.",
            },
            {
              icon: MapPin,
              title: "Where it fits",
              copy: "Aria Care sits before the official workplace record. It helps structure what the worker provides, then the user reviews and pastes the final version into their provider system.",
            },
            {
              icon: ShieldCheck,
              title: "What it does not claim",
              copy: "Aria Care does not claim NDIS approval, NDIS compliance, legal compliance, clinical approval or audit guarantees. It is a practical documentation assistant.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="card p-6">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-aria-50 text-aria-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-display text-xl font-bold text-slate-900">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.copy}</p>
              </div>
            );
          })}
        </div>
      </section>

      <Footer />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, Copy, FileSearch, Link2, MessageCircleQuestion, Mic, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Progress Notes for Support Workers | Copy into ShiftCare",
  description: "Create structured, review-ready disability support progress note drafts from voice notes or bullet points, connect them to goals, and copy into ShiftCare, Lumary, Brevity or your workplace platform.",
  alternates: { canonical: "/progress-notes" },
};

const headings = [
  "Participant presentation",
  "Support provided",
  "Goals/outcomes",
  "Mood/risk/concerns",
  "Daily living skills",
  "Incidents/injuries",
  "Handover/follow-up",
];

const faqs = [
  {
    q: "What should a disability support progress note include?",
    a: "A useful progress note should cover what happened during the shift, what support was provided, how the participant presented, any goals or daily living skills worked on, risks or incidents if relevant, and clear handover or follow-up notes.",
  },
  {
    q: "Can I use Aria Care if my provider already uses ShiftCare?",
    a: "Yes. Aria Care is designed for copy-and-paste workflows. You can create a draft in Aria, review it, then paste it into ShiftCare or another workplace platform your organisation uses.",
  },
  {
    q: "Does AI replace human review?",
    a: "No. Aria creates structured drafts only. Support workers and providers should review, edit, and follow their organisation's reporting and escalation processes before submitting.",
  },
  {
    q: "How does Aria help connect notes to participant goals?",
    a: "GoalLink Copilot turns participant goals into plain-language cards and links a note to relevant goals only when the worker's shift details support that connection.",
  },
  {
    q: "What is Adaptive Shift Debrief Mode?",
    a: "It is a quick after-shift prompt layer that asks only the missing questions, such as how the participant responded, whether there were risks, what goal was worked on, or what the next worker should know.",
  },
  {
    q: "Can providers use note history for reviews?",
    a: "Yes. Plan Review Evidence Packs summarise 30, 60 or 90 days of notes into themes such as goal evidence, support provided, presentation changes, risks, and follow-up actions.",
  },
  {
    q: "Does Aria work if my workplace uses Lumary, Brevity or CareMaster instead of ShiftCare?",
    a: "Yes. Universal Platform Bridge creates clean paste-ready formats for ShiftCare, Lumary, Brevity, CareMaster, email handovers, incident summaries and plain text.",
  },
];

const intelligenceFeatures = [
  {
    icon: Link2,
    title: "GoalLink Copilot",
    copy: "Type participant goals once, then let Aria suggest safe goal connections only when the shift note includes supporting evidence.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Adaptive Shift Debrief Mode",
    copy: "Aria asks 2-4 smart missing-detail questions after a shift instead of forcing workers through another long form.",
  },
  {
    icon: FileSearch,
    title: "Plan Review Evidence Packs",
    copy: "Turn repeated notes into 30/60/90-day themes for reviews: support examples, progress, risks, presentation, and follow-up.",
  },
  {
    icon: Copy,
    title: "Universal Platform Bridge",
    copy: "Import rough-note photos, then copy the reviewed note into ShiftCare, Lumary, Brevity, CareMaster, email handover, incident forms, or plain text.",
  },
  {
    icon: ShieldAlert,
    title: "Dignity + Risk Guardian",
    copy: "Catch vague language, judgemental wording, unsupported no-incident claims, and risky compliance language before filing.",
  },
];

const pageJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "AI Progress Notes for Support Workers",
  description: "A practical guide to creating structured, review-ready disability support progress note drafts.",
  author: { "@type": "Organization", name: "Aria Care" },
  publisher: { "@type": "Organization", name: "Aria Care" },
  mainEntityOfPage: "https://www.ariacare.app/progress-notes",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};

export default function ProgressNotesPage() {
  return (
    <main className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className="relative overflow-hidden px-6 pt-28 pb-16">
        <div className="absolute inset-0 bg-hero-mesh pointer-events-none" />
        <div className="dot-pattern absolute inset-0 opacity-25 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-aria-200 bg-aria-50 px-3 py-1 text-xs font-bold text-aria-700">
            <Mic className="w-3.5 h-3.5" /> Voice or bullet points to structured notes
          </div>
          <h1 className="mt-6 font-display text-5xl md:text-6xl font-bold text-slate-900 tracking-tight">
            AI progress notes for support workers
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-600 leading-relaxed">
            Aria Care helps individual support workers and provider teams turn messy after-shift thoughts into structured, factual, review-ready drafts that can be copied into ShiftCare, Lumary, Brevity, CareMaster or another workplace system.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup?plan=solo_free" className="btn-primary">
              Start Free Solo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/#roi" className="btn-secondary">Calculate provider ROI</Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <article className="lg:col-span-2 card p-6 md:p-8">
            <h2 className="font-display text-3xl font-bold text-slate-900">The best progress notes are structured, factual and easy to review.</h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              A tired worker should not have to stare at a blank page after a long shift. The right workflow lets them speak naturally, capture the important facts, review the result, and paste a clean draft into the system their workplace already uses.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {headings.map((heading) => (
                <div key={heading} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <CheckCircle2 className="w-4 h-4 text-aria-600 mb-2" />
                  <p className="font-semibold text-slate-900">{heading}</p>
                </div>
              ))}
            </div>

            <h3 className="mt-10 font-display text-2xl font-bold text-slate-900">Example output structure</h3>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-950 text-slate-100 p-5 font-mono text-sm leading-relaxed">
              <p className="text-aria-200">Progress Note</p>
              <p className="mt-3">Participant presentation: J appeared calm when support commenced.</p>
              <p className="mt-2">Support provided: J was supported with grocery shopping and choosing items from his list.</p>
              <p className="mt-2">Goals/outcomes: J practised decision-making, community access and checkout interaction skills.</p>
              <p className="mt-2">Incidents/injuries: No incidents were reported during the shift.</p>
              <p className="mt-2">Handover/follow-up: Encourage hydration next shift and check whether J still feels tired.</p>
            </div>

            <h3 className="mt-10 font-display text-2xl font-bold text-slate-900">New: documentation intelligence for real support work</h3>
            <p className="mt-3 text-slate-600 leading-relaxed">
              Most note tools stop at rewriting text. Aria is built around the actual support-worker workflow: record messy thoughts, fill only the missing details, connect support to goals safely, check dignity and risk language, then copy into the platform the provider already uses.
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {intelligenceFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <Icon className="w-4 h-4 text-aria-600 mb-2" />
                    <p className="font-semibold text-slate-900">{feature.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{feature.copy}</p>
                  </div>
                );
              })}
            </div>
          </article>

          <aside className="space-y-4">
            {[
              { icon: ClipboardCheck, title: "Quality score", copy: "Checks structure, handover clarity and risky wording before copy/paste." },
              { icon: Copy, title: "Paste-ready formats", copy: "Copy full notes, short versions, handover summaries or incident summaries." },
              { icon: ShieldAlert, title: "Draft-only safety", copy: "Aria creates drafts only. Always review and edit before submitting to your workplace system." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card p-5">
                  <Icon className="w-5 h-5 text-aria-600 mb-3" />
                  <h3 className="font-display font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.copy}</p>
                </div>
              );
            })}
          </aside>
        </div>
      </section>

      <section className="px-6 py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-slate-900 text-center">Progress note questions</h2>
          <div className="mt-8 space-y-4">
            {faqs.map((faq) => (
              <details key={faq.q} className="card p-5 group">
                <summary className="list-none flex items-center justify-between gap-4 font-semibold text-slate-900 cursor-pointer">
                  {faq.q}
                  <span className="text-aria-500 text-lg group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

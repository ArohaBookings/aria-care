import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCopy, FileSearch, Link2, MessageCircleQuestion, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Progress Notes for Support Workers: Voice Notes to ShiftCare",
  description: "Learn how individual support workers can turn voice notes and bullet points into review-ready progress notes, handovers and incident drafts they can copy into ShiftCare, Lumary, Brevity or CareMaster.",
  alternates: { canonical: "/blog/ai-progress-notes-support-workers" },
};

const sections = [
  {
    icon: MessageCircleQuestion,
    title: "Start with a 60-second debrief",
    body: "Speak naturally after the shift. Aria looks for what is missing and asks only useful follow-up questions, such as participant response, risk, goal connection or handover detail.",
  },
  {
    icon: Link2,
    title: "Connect support to goals safely",
    body: "GoalLink Copilot uses participant goals as context, but only links the note to a goal when the shift details actually support that connection.",
  },
  {
    icon: ClipboardCopy,
    title: "Copy into the platform you already use",
    body: "Universal Platform Bridge can import rough-note photos and gives paste-ready formats for ShiftCare, Lumary, Brevity, CareMaster, email handovers, incident summaries and plain text.",
  },
  {
    icon: ShieldAlert,
    title: "Check dignity and risk language",
    body: "Dignity + Risk Guardian helps replace vague or judgemental language with observable, factual wording that is easier for coordinators to review.",
  },
  {
    icon: FileSearch,
    title: "Build review evidence over time",
    body: "Plan Review Evidence Packs turn note history into themes for 30, 60 or 90-day reviews: progress, supports, presentation, risks and follow-up patterns.",
  },
];

const faqs = [
  {
    q: "Can I use Aria Care if my provider has not adopted it?",
    a: "Yes. Individual support workers can create a draft in Aria, review it, then copy and paste it into the platform their workplace already uses.",
  },
  {
    q: "Should I include participant full names in Solo notes?",
    a: "Use initials or nicknames where possible and avoid unnecessary personal details. Users control what they paste into workplace systems.",
  },
  {
    q: "Does Aria guarantee compliance?",
    a: "No. Aria creates structured drafts only. Workers and providers should review, edit and follow their organisation's reporting and escalation process.",
  },
];

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "AI Progress Notes for Support Workers: Voice Notes to ShiftCare",
  description: "How support workers can use AI to create review-ready progress notes, handovers and incident drafts.",
  author: { "@type": "Organization", name: "Aria Care" },
  publisher: { "@type": "Organization", name: "Aria Care" },
  mainEntityOfPage: "https://www.ariacare.app/blog/ai-progress-notes-support-workers",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
};

export default function SupportWorkerAiNotesArticle() {
  return (
    <main className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <article>
        <section className="relative overflow-hidden px-6 pt-28 pb-16">
          <div className="absolute inset-0 bg-hero-mesh pointer-events-none" />
          <div className="dot-pattern absolute inset-0 opacity-25 pointer-events-none" />
          <div className="relative max-w-4xl mx-auto">
            <Link href="/blog" className="text-sm font-bold text-aria-700 hover:text-aria-800">Back to blog</Link>
            <h1 className="mt-6 font-display text-5xl md:text-6xl font-bold tracking-tight text-slate-900">
              How support workers can turn after-shift voice notes into copy-ready progress notes
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              The fastest workflow is simple: create in Aria Care, review the draft, then copy it into ShiftCare, Lumary, Brevity, CareMaster or whatever platform your provider already uses.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/signup?plan=solo_free" className="btn-primary">
                Start Free Solo <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/progress-notes" className="btn-secondary">See progress-note examples</Link>
            </div>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-slate max-w-none">
              <p className="text-lg leading-relaxed text-slate-700">
                Support notes are often written at the worst possible time: after the shift, between participants, in the car, or late at night. Aria Care Solo is designed for that moment. You can speak or type rough bullet points, answer a few missing-detail prompts, and get a structured draft that is ready to review.
              </p>

              <h2 className="font-display text-3xl font-bold text-slate-900">What a strong note should do</h2>
              <p className="leading-relaxed text-slate-700">
                A useful note should explain what support was provided, how the participant presented, what goals or independence skills were worked on, whether there were risks or incidents, and what the next worker or coordinator needs to know. It should not guess intent, overstate progress, or include unnecessary personal details.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <div key={section.title} className="card p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-teal-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-display text-xl font-bold text-slate-900">{section.title}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{section.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-wide text-teal-200">Example worker input</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Supported J from 2 to 5. Calm on arrival. Went grocery shopping and practised choosing items from his list. Needed prompting at checkout but handled the interaction well. No incidents. Tired near the end, returned home and rested. Next worker should encourage hydration and check if he still feels tired.
              </p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="font-semibold text-white">Expected Aria output</p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  {["Shift summary", "Support provided", "Mood/presentation", "Goals/independence", "No incident noted", "Handover/follow-up"].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-teal-200" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <section className="mt-12">
              <h2 className="font-display text-3xl font-bold text-slate-900">Common questions</h2>
              <div className="mt-5 space-y-4">
                {faqs.map((faq) => (
                  <details key={faq.q} className="card p-5 group">
                    <summary className="list-none flex cursor-pointer items-center justify-between gap-4 font-semibold text-slate-900">
                      {faq.q}
                      <span className="text-aria-500 text-lg group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>
        </section>
      </article>
    </main>
  );
}

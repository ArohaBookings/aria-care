import Link from "next/link";
import { Check, X, ArrowRight, Sparkles } from "lucide-react";

const ARIA_ADVANTAGES = [
  "No prompt writing — just record a voice note or type rough bullets",
  "Purpose-built note types: progress, dot-point, handover, incident, daily snapshot",
  "Participant-friendly summaries you can read with the person you support",
  "Built-in review reminders, missing-detail prompts and risk flags",
  "Copy-ready, consistent formats for ShiftCare, Lumary, Brevity and more",
  "Privacy and consent kept front of mind, with optional carer sign-off",
];

const CHATGPT_LIMITS = [
  "You write — and re-write — the prompt every shift",
  "Generic output that isn't shaped for support documentation",
  "No participant-friendly version or support-log sign-off",
  "No review reminders, missing-detail checks or risk flags",
  "Formatting drifts between workers and shifts",
  "Easy to over-share details, with no privacy guardrails",
];

const EXAMPLE_INPUT =
  "Visited Sam 10–12. Helped with groceries. Sam was anxious at the checkout. Took a break outside. No incident. Remind next worker about appointment.";

const EXAMPLE_OUTPUTS: Array<{ label: string; body: string }> = [
  {
    label: "Dot-point note",
    body: "• Supported Sam 10:00–12:00 with grocery shopping\n• Appeared anxious at the checkout; took a short break outside, then settled\n• No incidents reported\n• Follow-up: remind next worker about upcoming appointment",
  },
  {
    label: "Structured progress note",
    body: "Participant presentation: Sam appeared anxious at the checkout and settled after a short break outside.\nSupport provided: Grocery shopping support, 10:00–12:00.\nMood/risk/concerns: Brief anxiety at the checkout; no incident.\nHandover/follow-up: Remind next worker about the upcoming appointment.",
  },
  {
    label: "Handover summary",
    body: "Key updates: Grocery shop went well; Sam settled after a brief anxious moment at the checkout.\nWhat to watch: Busy checkouts can raise anxiety.\nNext shift notes: Remind Sam about the upcoming appointment.",
  },
  {
    label: "Participant-friendly",
    body: "Today we did your grocery shopping together. The checkout was a bit busy, so we took a short break outside and then finished up. Just a reminder that you have an appointment coming up.",
  },
  {
    label: "Coordinator summary",
    body: "What happened: Grocery support; brief anxiety at the checkout, then settled.\nRisks: Checkout/queue anxiety.\nFollow-up: Appointment reminder for the next shift.",
  },
];

export default function WhyNotChatGPT() {
  return (
    <section id="why-not-chatgpt" className="py-24 px-6 bg-slate-50/60">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-aria-50 border border-aria-200 px-4 py-1.5 text-xs font-semibold text-aria-700">
            <Sparkles className="w-3.5 h-3.5" /> Why not just ChatGPT?
          </span>
          <h2 className="font-display text-4xl font-bold text-slate-900 mt-4">
            ChatGPT writes text. Aria Care is built for support work.
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto mt-3">
            A general chatbot can help you write — but it doesn&apos;t understand shift documentation,
            handovers, or the people you support. Aria Care is the workflow around it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
          <div className="card p-6 border-aria-200">
            <h3 className="font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-aria-gradient flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </span>
              Aria Care
            </h3>
            <ul className="space-y-2.5">
              {ARIA_ADVANTAGES.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-6">
            <h3 className="font-display font-bold text-slate-500 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">AI</span>
              A general chatbot
            </h3>
            <ul className="space-y-2.5">
              {CHATGPT_LIMITS.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-500">
                  <X className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Before / after example */}
        <div id="example" className="scroll-mt-24">
          <div className="flex items-center justify-center gap-2 mb-6">
            <h3 className="font-display text-2xl font-bold text-slate-900 text-center">
              One rough note, every format you need
            </h3>
            <span className="rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
              Example only
            </span>
          </div>

          <div className="card p-5 mb-5 border-dashed">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">What the worker typed</p>
            <p className="text-sm text-slate-700 italic leading-relaxed">&ldquo;{EXAMPLE_INPUT}&rdquo;</p>
          </div>

          <div className="flex justify-center mb-5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-aria-700">
              <ArrowRight className="w-4 h-4 rotate-90" /> Aria Care can create
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXAMPLE_OUTPUTS.map((output) => (
              <div key={output.label} className="card p-5">
                <p className="text-xs font-bold text-aria-700 mb-2">{output.label}</p>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{output.body}</p>
              </div>
            ))}
            <div className="card p-5 bg-aria-gradient text-white flex flex-col justify-center">
              <p className="font-display font-bold text-lg mb-1">Your turn</p>
              <p className="text-sm text-white/80 mb-4">Review, edit, and paste into your workplace system. Always your judgement, your sign-off.</p>
              <Link href="/signup?plan=solo_free" className="inline-flex items-center gap-1.5 text-sm font-bold text-white hover:gap-2.5 transition-all">
                Start Free Solo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6 max-w-2xl mx-auto">
            Example only — not a real participant. Aria Care creates drafts to review and edit. It does not replace
            your judgement, your organisation&apos;s policies, official reporting systems, or participant consent.
          </p>
        </div>
      </div>
    </section>
  );
}

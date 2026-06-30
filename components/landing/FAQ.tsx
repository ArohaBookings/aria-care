export const FAQS = [
  { q: "Is Aria a substitute for review or compliance advice?", a: "No. Aria creates structured, review-ready drafts to help reduce missing details and blank-page writing. Your team should always review notes and follow your organisation's reporting process." },
  { q: "Do I need technical skills to set this up?", a: "No. Setup takes about 5 minutes — add your organisation details, invite your team, and you're ready. No IT support needed." },
  { q: "What happens to our data?", a: "Your data is stored in cloud infrastructure with access controls. Aria is designed with Australia and New Zealand privacy expectations in mind, and you control what you enter, review, save and paste into workplace systems." },
  { q: "Can support workers use it on their phones?", a: "Yes. The voice recorder is fully mobile-optimised and works on any smartphone. Workers don't need to install anything — it works in the browser." },
  { q: "Does it work for aged care providers too?", a: "Absolutely. While built with NDIS in mind, the documentation suite works for aged care, mental health, and any care sector where progress notes and compliance tracking are required." },
  { q: "Does Aria officially integrate with ShiftCare, Lumary or Brevity?", a: "Not yet. Aria Care is currently designed to work alongside those systems with copy-ready drafts. You create the draft in Aria, review it, then paste it into your workplace platform." },
  { q: "Why not just use ChatGPT for progress notes?", a: "ChatGPT can help write text, but Aria Care is built around support-work documentation. There's no prompt writing — you record or type rough notes and choose what you need: progress notes, dot-point notes, handovers, incident drafts, daily snapshots, coordinator summaries or participant-friendly versions. Aria adds review reminders, missing-detail prompts, risk flags, privacy and consent reminders, optional participant/carer sign-off, and copy-ready, consistent formats for your team." },
  { q: "How does Aria Care handle privacy and consent?", a: "Aria Care creates drafts only — you are responsible for what you enter. Follow your organisation's privacy, consent and data policies, avoid entering unnecessary identifying details, and review every draft before use. Aria includes a plain-language participant-friendly summary and an optional support-log sign-off so participants and carers can be involved. Aria Care does not replace official systems, professional judgement, or guarantee compliance." },
];

export default function FAQ() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl font-bold text-slate-900">Common questions</h2>
        </div>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <details key={faq.q} className="card p-5 group cursor-pointer">
              <summary className="font-semibold text-slate-900 text-sm list-none flex items-center justify-between">
                {faq.q}
                <span className="text-aria-500 text-lg ml-4 flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

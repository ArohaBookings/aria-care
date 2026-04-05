const FAQS = [
  { q: "Is Aria NDIS compliant?", a: "Yes. Every generated document follows current NDIS Practice Standards. Progress notes include all mandatory elements. We update templates whenever NDIS requirements change." },
  { q: "Do I need technical skills to set this up?", a: "No. Setup takes about 5 minutes — add your organisation details, invite your team, and you're ready. No IT support needed." },
  { q: "What happens to our data?", a: "Your data is stored securely in Australia using encrypted cloud storage. We never share data with third parties and are fully compliant with Australian Privacy Act requirements." },
  { q: "Can support workers use it on their phones?", a: "Yes. The voice recorder is fully mobile-optimised and works on any smartphone. Workers don't need to install anything — it works in the browser." },
  { q: "Does it work for aged care providers too?", a: "Absolutely. While built with NDIS in mind, the documentation suite works for aged care, mental health, and any care sector where progress notes and compliance tracking are required." },
  { q: "Can I import our existing participant data?", a: "Yes. We support CSV import and can help migrate data from ShiftCare, Careview, and other common platforms during onboarding." },
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

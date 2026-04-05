import { Star, Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Rachel M.",
    role: "NDIS Provider · 22 participants · Brisbane",
    initials: "RM",
    quote: "My support workers were spending 2 hours after every shift doing notes. Now they record a voice memo in the car and it's done. I genuinely cannot overstate how much this has changed our business.",
    stat: "Saved 80hrs/month",
  },
  {
    name: "James K.",
    role: "Provider Director · 41 participants · Auckland",
    initials: "JK",
    quote: "We had an NDIS audit last month. I clicked 'Generate Audit Pack' for each participant and had everything the auditor needed in 20 minutes. Previously that took two admin staff three days.",
    stat: "Passed audit first time",
  },
  {
    name: "Priya S.",
    role: "Solo Operator · 8 participants · Melbourne",
    initials: "PS",
    quote: "As a sole operator I was doing ALL the admin myself at 10pm every night. Aria basically gave me my evenings back. The billing assistant alone found $4,200 in claims I'd missed in one month.",
    stat: "$4.2k in recovered claims",
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="section-title mb-3">Providers love Aria</p>
          <h2 className="font-display text-4xl font-bold text-slate-900">Real results from real providers.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="card card-hover p-7 flex flex-col">
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
              </div>
              <Quote className="w-6 h-6 text-aria-200 mb-3" />
              <p className="text-slate-700 text-sm leading-relaxed flex-1 mb-5">&ldquo;{t.quote}&rdquo;</p>
              <div className="inline-flex items-center gap-2 bg-aria-50 border border-aria-100 rounded-full px-3 py-1 w-fit mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-aria-500" />
                <span className="text-xs font-bold text-aria-700">{t.stat}</span>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className="w-9 h-9 rounded-full bg-aria-gradient flex items-center justify-center text-xs font-bold text-white">{t.initials}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

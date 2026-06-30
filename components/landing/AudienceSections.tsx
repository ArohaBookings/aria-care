import Link from "next/link";
import { ArrowRight, ClipboardCheck, Copy, MapPin, ShieldCheck, UserRound, UsersRound } from "lucide-react";

const audienceCards = [
  {
    icon: UserRound,
    title: "For individual support workers",
    copy: "Finish a shift, speak naturally or type rough bullets, then get a structured draft you can edit before copying into your workplace system.",
    points: ["Voice or bullet points", "Short, full and handover copy options", "Private Solo note history"],
  },
  {
    icon: UsersRound,
    title: "For coordinators and providers",
    copy: "Reduce admin rework by helping workers capture clearer support, presentation, risk and follow-up details before notes reach review.",
    points: ["Team review workflows", "Weak-note visibility", "Provider dashboards and billing pathways"],
  },
];

const trustItems = [
  {
    icon: Copy,
    title: "Works alongside your existing platform",
    copy: "Aria Care is designed for copy-and-paste workflows with ShiftCare, Lumary, Brevity, CareMaster and other provider systems. It is not presented as an official integration.",
  },
  {
    icon: MapPin,
    title: "Built in NZ for Australia & NZ",
    copy: "Aria Care is built by Leo in New Zealand for the practical after-shift documentation needs of workers and small providers across Australia and New Zealand.",
  },
  {
    icon: ShieldCheck,
    title: "Draft only: always review",
    copy: "Aria Care helps prepare structured drafts. It does not replace worker judgement, provider processes, incident reporting requirements or workplace review.",
  },
  {
    icon: ClipboardCheck,
    title: "Try a real shift note first",
    copy: "The fastest test is simple: record a quick voice note or type a few bullet points from a real shift, then check whether the draft is useful enough to paste.",
  },
];

export default function AudienceSections() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[0.78fr_1.22fr] gap-10 items-start">
          <div className="lg:sticky lg:top-24">
            <p className="section-title mb-3">Built for the actual workflow</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
              The layer before your workplace system.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Support workers do not need another blank form after a shift. They need a quick capture flow, practical structure, and a draft that is easy to review before it goes anywhere official.
            </p>
            <Link href="/signup?plan=solo_free" className="btn-primary mt-7">
              Try Free Solo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {audienceCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="card card-hover p-6">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-teal-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-slate-900">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.copy}</p>
                    <div className="mt-5 space-y-2">
                      {card.points.map((point) => (
                        <div key={point} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-aria-500" />
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trustItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <Icon className="h-5 w-5 text-aria-600" />
                    <h3 className="mt-3 font-display font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.copy}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

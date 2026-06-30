import { Mic, Cpu, CheckCircle, TrendingUp } from "lucide-react";

const STEPS = [
  { icon: Mic, num: "01", title: "Worker finishes shift", desc: "They open Aria on their phone and record a short voice memo or type rough bullet points describing what happened during the shift.", detail: "Mobile browser friendly" },
  { icon: Cpu, num: "02", title: "Aria writes the draft", desc: "AI transcribes the audio when online, preserves typed input if something fails, and formats a structured draft with the details provided.", detail: "Friendly retry path" },
  { icon: CheckCircle, num: "03", title: "Review, edit and copy", desc: "Solo workers copy into their workplace platform. Provider teams can review, approve and file notes through shared workflows.", detail: "You stay in control" },
  { icon: TrendingUp, num: "04", title: "Insights build over time", desc: "Aria tracks goal progress across notes, alerts when a participant needs plan review, and flags funding hours running low — all without anyone asking.", detail: "Proactive, not reactive" },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-16">
          <p className="section-title mb-3">The process</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            From shift to reviewed note
            <br />
            <span className="text-gradient-teal">in under 2 minutes.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {/* Connector */}
          <div className="hidden md:block absolute top-14 left-[20%] right-[20%] h-px bg-gradient-to-r from-aria-200 via-aria-300 to-aria-200" />

          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-28 h-28 card rounded-2xl flex items-center justify-center shadow-card-hover border-slate-200 group hover:border-aria-200 transition-all">
                    <Icon className="w-10 h-10 text-aria-600" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-500">{step.num}</span>
                  </div>
                </div>
                <h3 className="font-display font-bold text-slate-900 text-base mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">{step.desc}</p>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{step.detail}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-16 card p-6 md:p-8 border-aria-200 bg-aria-50/30 max-w-3xl mx-auto text-center">
          <p className="font-display text-xl font-bold text-slate-900 mb-2">
            If notes take even <span className="text-gradient-teal">10-15 minutes each</span>, the admin drag compounds fast.
          </p>
          <p className="text-slate-600">Use the ROI calculator above to model your own team instead of relying on generic averages.</p>
        </div>
      </div>
    </section>
  );
}

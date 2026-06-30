import { ClipboardCopy, FileSearch, Link2, MessageCircleQuestion, ShieldAlert, Sparkles } from "lucide-react";

const NEW_FEATURES = [
  {
    icon: Link2,
    title: "GoalLink Copilot",
    tag: "Game changer",
    description: "Upload or type participant goals once. Aria turns them into simple goal cards, then links shift notes to relevant goals only when the worker gives evidence.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Adaptive Shift Debrief Mode",
    tag: "Game changer",
    description: "Instead of a long form, Aria asks 2-4 smart follow-up questions after a shift: risks, response, goal connection, and next-worker handover.",
  },
  {
    icon: FileSearch,
    title: "Plan Review Evidence Pack",
    tag: "Game changer",
    description: "After enough notes, Aria builds 30/60/90-day review themes: goal progress, support examples, risks, presentation changes, and follow-up patterns.",
  },
  {
    icon: ClipboardCopy,
    title: "Universal Platform Bridge",
    tag: "High ROI",
    description: "Create in Aria, import rough-note photos, then copy into ShiftCare, Lumary, Brevity, CareMaster, email handover, incident forms, or plain text.",
  },
  {
    icon: ShieldAlert,
    title: "Dignity + Risk Guardian",
    tag: "Retention",
    description: "Flags vague wording, judgemental phrasing, unsupported no-incident claims, and missing risk detail before a note gets pasted or filed.",
  },
];

export default function IntelligenceLayer() {
  return (
    <section id="new" className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
          <div className="lg:col-span-2 lg:sticky lg:top-24">
            <div className="inline-flex items-center gap-2 rounded-full border border-aria-200 bg-aria-50 px-3 py-1 text-xs font-bold text-aria-700">
              <Sparkles className="w-3.5 h-3.5" /> New intelligence layer
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-900 mt-5 leading-tight">
              Five features built to make Aria the layer before every care platform.
            </h2>
            <p className="text-lg text-slate-600 mt-4 leading-relaxed">
              The goal is not “AI writes nicer paragraphs.” It is documentation intelligence: faster notes, clearer goals, better handovers, stronger review evidence, and safer copy-paste workflows.
            </p>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-950 text-white p-5 overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.18),transparent_38%)]" />
              <div className="relative">
                <p className="text-xs uppercase tracking-wide text-slate-400">Live product preview</p>
                <div className="mt-4 rounded-2xl bg-white/10 border border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Goal-linked draft</p>
                      <p className="text-xs text-slate-400">ShiftCare-ready, review checked</p>
                    </div>
                    <p className="font-display text-4xl font-bold text-emerald-300">94</p>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-[94%] rounded-full bg-aria-gradient chart-bar-pop" />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {["GoalLink", "Debrief", "Evidence pack", "Risk guardian"].map((item) => (
                    <span key={item} className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-slate-200">{item}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            {NEW_FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`card card-hover p-6 ${index === 0 ? "md:col-span-2 border-aria-200 bg-gradient-to-br from-aria-50 to-white" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="rounded-full border border-aria-200 bg-aria-50 px-2.5 py-1 text-[10px] font-bold text-aria-700">
                      {feature.tag}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

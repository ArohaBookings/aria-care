import { Mic, Shield, DollarSign, Calendar, FileText, Bot, Users, AlertTriangle } from "lucide-react";

const FEATURES = [
  {
    icon: Mic,
    title: "Solo Voice-to-Note",
    description: "Record a 60-second after-shift voice memo. Aria turns it into a structured draft you can review and copy into ShiftCare, Lumary, Brevity, or any workplace platform.",
    highlight: true,
    tag: "Solo",
  },
  {
    icon: FileText,
    title: "AI Document Suite",
    description: "Support plans, incident reports, risk assessments, handover notes — generated from guided inputs as structured drafts for human review.",
    tag: "Core",
  },
  {
    icon: Shield,
    title: "Review and rework radar",
    description: "Spot notes that may need more detail before they become coordinator rework: vague wording, missing presentation, weak handover or unclear incident follow-up.",
    tag: "Core",
  },
  {
    icon: DollarSign,
    title: "Intelligent Billing Assistant",
    description: "Helps teams compare shift records, notes and billing readiness so missing documentation is easier to catch before admin time is wasted.",
    tag: "Pro",
  },
  {
    icon: Calendar,
    title: "Smart Rostering",
    description: "Schedule that knows participant funding hours, worker skills, and travel time. Alerts when funding is about to run out. No more billing surprises.",
    tag: "Pro",
  },
  {
    icon: Bot,
    title: "AI Coordinator Agent",
    description: "Practical assistant workflows for drafting follow-up messages, worker briefings and missing-note nudges while coordinators stay in control.",
    tag: "Business",
  },
  {
    icon: Users,
    title: "Participant Portal",
    description: "A read-only pathway for schedules, goals and support history when providers want clearer visibility for participants and families.",
    tag: "Pro",
  },
  {
    icon: AlertTriangle,
    title: "Audit Pack Generator",
    description: "Pull participant notes, plans, incidents and billing context into a review pack your team can check before any formal use.",
    tag: "Core",
  },
];

const TAG_STYLES: Record<string, string> = {
  Solo: "bg-aria-50 text-aria-700 border-aria-200",
  Core: "bg-slate-100 text-slate-600 border-slate-200",
  Pro: "bg-blue-50 text-blue-700 border-blue-200",
  Business: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="section-title mb-3">Purpose-built documentation</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Not another generic AI writer.
            <br />
            <span className="text-gradient-teal">A support-note workflow.</span>
          </h2>
          <p className="text-slate-600 text-lg leading-relaxed">
            Use Aria Care even if your company is not ready yet. Individuals can create copy-ready drafts today, and providers can move to team workflows when documentation needs to scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`card card-hover p-6 relative group ${f.highlight ? "border-aria-200 bg-gradient-to-b from-aria-50/50 to-white" : ""}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.highlight ? "bg-aria-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TAG_STYLES[f.tag]}`}>{f.tag}</span>
                </div>
                <h3 className="font-display font-bold text-slate-900 mb-2 text-base">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

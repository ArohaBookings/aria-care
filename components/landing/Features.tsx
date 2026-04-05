import { Mic, Shield, DollarSign, Calendar, FileText, Bot, Users, AlertTriangle } from "lucide-react";

const FEATURES = [
  {
    icon: Mic,
    title: "Voice-to-Progress-Note",
    description: "Workers record a 60-second voice memo. Aria transcribes, structures, and generates a fully NDIS-compliant progress note. 45 minutes → 90 seconds.",
    highlight: true,
    tag: "Most loved",
  },
  {
    icon: FileText,
    title: "AI Document Suite",
    description: "Support plans, incident reports, risk assessments, handover notes — all generated from guided inputs. Every document audit-ready.",
    tag: "Core",
  },
  {
    icon: Shield,
    title: "Compliance Command Centre",
    description: "Every staff certification, participant plan review, and incident report tracked with 90/60/30-day alerts. Know your compliance status in 10 seconds.",
    tag: "Core",
  },
  {
    icon: DollarSign,
    title: "Intelligent Billing Assistant",
    description: "Matches shift records to NDIS line items automatically. Flags missing notes before submission. Stops you leaving money on the table.",
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
    description: "Background AI that monitors participants, drafts plan review emails, sends worker briefings, and chases missing notes — proactively.",
    tag: "Business",
  },
  {
    icon: Users,
    title: "Participant Portal",
    description: "Participants and families see their schedule, goals, and support history in a clean, read-only portal. Reduce coordinator phone calls by 60%.",
    tag: "Pro",
  },
  {
    icon: AlertTriangle,
    title: "Audit Pack Generator",
    description: "NDIS audit coming? One click pulls all documentation for any participant — notes, plans, incidents, billing — formatted for the auditor.",
    tag: "Core",
  },
];

const TAG_STYLES: Record<string, string> = {
  "Most loved": "bg-aria-50 text-aria-700 border-aria-200",
  Core: "bg-slate-100 text-slate-600 border-slate-200",
  Pro: "bg-blue-50 text-blue-700 border-blue-200",
  Business: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="section-title mb-3">Everything you need</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Not a scheduling app.
            <br />
            <span className="text-gradient-teal">An operating system.</span>
          </h2>
          <p className="text-slate-600 text-lg leading-relaxed">
            ShiftCare and Careview schedule shifts. Aria handles everything that happens before, during, and after — the documentation, compliance, and billing that's burying your team.
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

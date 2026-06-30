"use client";
import Link from "next/link";
import { ArrowRight, Mic, FileText, Clock, CheckCircle2 } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-hero-mesh pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-aria-300/40 to-transparent" />
      <div className="dot-pattern absolute inset-0 opacity-30 pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex justify-center mb-8 animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-aria-50 border border-aria-200 rounded-full px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-aria-500 animate-pulse-soft" />
            <span className="text-xs font-semibold text-aria-700 tracking-wide">Built in New Zealand for support workers and providers across Australia & NZ.</span>
          </div>
        </div>

        <div className="text-center mb-6 animate-fade-up-1">
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 leading-[1.05] tracking-tight">
            Turn rough shift notes into structured,{" "}
            <br />
            <span className="text-gradient-teal">copy-ready progress notes.</span>
          </h1>
        </div>

        <p className="text-center text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up-2">
          Record a voice note or type bullet points after a shift. Aria Care helps create a draft you can review, edit and paste into ShiftCare, Lumary, Brevity or your workplace system.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up-3">
          <Link href="/signup?plan=solo_free" className="btn-primary text-base px-7 py-3.5 shadow-teal group">
            Start Free Solo
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link href="/signup?plan=growth" className="btn-secondary text-base px-7 py-3.5">
            Provider team trial
          </Link>
          <Link href="/progress-notes" className="btn-secondary text-base px-7 py-3.5">
            See examples
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 mb-16 animate-fade-up-4">
          {["Free Solo needs no card", "Draft only: always review", "Copy-ready for workplace platforms", "No official integration claimed"].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-aria-500" />
              {item}
            </span>
          ))}
        </div>

        {/* Demo UI preview */}
        <div className="max-w-4xl mx-auto animate-fade-up-5">
          <div className="card overflow-hidden shadow-xl border-slate-200">
            {/* Window bar */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs font-mono text-slate-400">ariacare.app — Voice to Note</span>
              <div />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left - Recording */}
              <div className="p-8 border-r border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <Mic className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Recording</span>
                  <span className="ml-auto text-xs font-mono text-red-500 animate-pulse">● 0:47</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-slate-600 leading-relaxed italic">
                    &ldquo;Marcus 9 to 11:30. Morning routine and breakfast. Appeared settled. Made toast and coffee
                    with minimal prompting. Became anxious around 10am; used breathing strategy and settled.
                    Handover: encourage hydration...&rdquo;
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-end gap-0.5 h-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 ml-auto">Transcribing...</span>
                </div>
              </div>

              {/* Right - Generated note */}
              <div className="p-8">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-aria-600" />
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Draft note</span>
                  <span className="ml-auto badge-green">Review checked</span>
                </div>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex gap-2"><span className="font-semibold text-slate-500 w-20 flex-shrink-0">Participant:</span><span>Marcus T.</span></div>
                  <div className="flex gap-2"><span className="font-semibold text-slate-500 w-20 flex-shrink-0">Date:</span><span>Today, 9:00–11:30am</span></div>
                  <div className="flex gap-2"><span className="font-semibold text-slate-500 w-20 flex-shrink-0">Support:</span><span>Daily Living Skills</span></div>
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="font-semibold text-slate-600 mb-1">Progress Note</p>
                    <p className="text-slate-600 leading-relaxed">
                      <span className="font-semibold">Participant presentation:</span> Marcus appeared settled on arrival.<br />
                      <span className="font-semibold">Support provided:</span> Morning routine and meal preparation with minimal prompting.<br />
                      <span className="font-semibold">Mood/risk/concerns:</span> Anxiety noted at 10am; breathing strategy helped.<br />
                      <span className="font-semibold">Handover/follow-up:</span> Continue encouraging independence and hydration.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  Generated in 8 seconds
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

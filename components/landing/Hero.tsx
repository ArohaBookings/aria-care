"use client";
import Link from "next/link";
import { ArrowRight, Mic, FileText, Clock, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

const ROTATING_WORDS = ["progress notes", "support plans", "incident reports", "compliance docs", "audit packs"];

export default function Hero() {
  const [wordIdx, setWordIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setWordIdx(i => (i + 1) % ROTATING_WORDS.length);
        setVisible(true);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-hero-mesh pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-aria-300/40 to-transparent" />
      <div className="dot-pattern absolute inset-0 opacity-30 pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Badge */}
        <div className="flex justify-center mb-8 animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-aria-50 border border-aria-200 rounded-full px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-aria-500 animate-pulse-soft" />
            <span className="text-xs font-semibold text-aria-700 tracking-wide">Purpose-built for NDIS providers · Australia & New Zealand</span>
          </div>
        </div>

        {/* Headline */}
        <div className="text-center mb-6 animate-fade-up-1">
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 leading-[1.05] tracking-tight">
            Write{" "}
            <span
              className="text-gradient-teal inline-block transition-all duration-300"
              style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)" }}
            >
              {ROTATING_WORDS[wordIdx]}
            </span>
            <br />
            in 90 seconds.
          </h1>
        </div>

        {/* Sub */}
        <p className="text-center text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up-2">
          Support workers record a voice memo. Aria writes the NDIS-compliant documentation.
          Stop losing 10 hours a week to paperwork — start delivering better care.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up-3">
          <Link href="/signup" className="btn-primary text-base px-7 py-3.5 shadow-teal group">
            Start free — 14 days free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link href="#how-it-works" className="btn-secondary text-base px-7 py-3.5">
            See how it works
          </Link>
        </div>

        {/* Trust bar */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 mb-16 animate-fade-up-4">
          {["Card-secured free trial", "NDIS compliant", "Cancel anytime", "Setup in 5 minutes"].map((item) => (
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
              <span className="text-xs font-mono text-slate-400">aria.care — Voice to Note</span>
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
                    &ldquo;Supported Marcus with his morning routine today. He was in good spirits and engaged well.
                    We worked on his meal prep goals — he independently made toast and a coffee with minimal 
                    prompting. Had a brief episode of anxiety around 10am, managed with breathing exercises...&rdquo;
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
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Generated Note</span>
                  <span className="ml-auto badge-green">NDIS Compliant</span>
                </div>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex gap-2"><span className="font-semibold text-slate-500 w-20 flex-shrink-0">Participant:</span><span>Marcus T.</span></div>
                  <div className="flex gap-2"><span className="font-semibold text-slate-500 w-20 flex-shrink-0">Date:</span><span>Today, 9:00–11:30am</span></div>
                  <div className="flex gap-2"><span className="font-semibold text-slate-500 w-20 flex-shrink-0">Support:</span><span>Daily Living Skills</span></div>
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="font-semibold text-slate-600 mb-1">Progress Note</p>
                    <p className="text-slate-600 leading-relaxed">Participant presented with positive affect and demonstrated increased independence in morning ADL routine. Successfully completed meal preparation task (toast and coffee) with minimal prompting, representing progress toward Goal 2.1. Anxiety episode (approx. 10:00am) was self-managed using previously taught breathing techniques with verbal support...</p>
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

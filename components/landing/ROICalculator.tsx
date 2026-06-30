"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calculator, Clock, DollarSign, TrendingUp } from "lucide-react";

export default function ROICalculator() {
  const [workers, setWorkers] = useState(12);
  const [notesPerWorker, setNotesPerWorker] = useState(16);
  const [minutesPerNote, setMinutesPerNote] = useState(12);
  const [hourlyCost, setHourlyCost] = useState(42);

  const result = useMemo(() => {
    const monthlyNotes = workers * notesPerWorker * 4;
    const currentHours = (monthlyNotes * minutesPerNote) / 60;
    const ariaHours = (monthlyNotes * 3) / 60;
    const hoursSaved = Math.max(currentHours - ariaHours, 0);
    const valueSaved = Math.round(hoursSaved * hourlyCost);
    const annualValue = valueSaved * 12;

    return {
      monthlyNotes,
      currentHours: Math.round(currentHours),
      hoursSaved: Math.round(hoursSaved),
      valueSaved,
      annualValue,
      reduction: currentHours ? Math.round((hoursSaved / currentHours) * 100) : 0,
    };
  }, [hourlyCost, minutesPerNote, notesPerWorker, workers]);

  const sliders = [
    { label: "Support workers", value: workers, setValue: setWorkers, min: 1, max: 80, suffix: "" },
    { label: "Notes per worker/week", value: notesPerWorker, setValue: setNotesPerWorker, min: 3, max: 40, suffix: "" },
    { label: "Minutes per note now", value: minutesPerNote, setValue: setMinutesPerNote, min: 5, max: 30, suffix: " min" },
    { label: "Loaded hourly cost", value: hourlyCost, setValue: setHourlyCost, min: 25, max: 85, suffix: "/hr" },
  ];

  return (
    <section id="roi" className="py-24 px-6 bg-slate-950 text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.22),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(8,145,178,0.16),transparent_28%)]" />
      <div className="max-w-6xl mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-teal-100">
              <Calculator className="w-3.5 h-3.5" /> New ROI calculator
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-5 leading-tight">
              Show providers the money hiding inside documentation.
            </h2>
            <p className="mt-4 text-slate-300 text-lg leading-relaxed">
              Aria turns the “we should probably fix notes one day” problem into a board-level cost line. Change the assumptions and see the monthly admin time a provider can attack first.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { icon: Clock, label: "Hours/month saved", value: result.hoursSaved.toLocaleString() },
                { icon: DollarSign, label: "Monthly value", value: `$${result.valueSaved.toLocaleString()}` },
                { icon: TrendingUp, label: "Annual value", value: `$${result.annualValue.toLocaleString()}` },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 animate-sheen">
                    <Icon className="w-4 h-4 text-aria-300 mb-3" />
                    <p className="font-display text-2xl font-bold">{item.value}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-xl p-5 md:p-6 shadow-2xl">
            <div className="space-y-5">
              {sliders.map((slider) => (
                <div key={slider.label}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-200">{slider.label}</label>
                    <span className="font-mono text-sm text-aria-200">{slider.value}{slider.suffix}</span>
                  </div>
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    value={slider.value}
                    onChange={(event) => slider.setValue(Number(event.target.value))}
                    className="w-full accent-teal-400"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-slate-950/70 border border-white/10 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Monthly notes</span>
                <span className="font-semibold">{result.monthlyNotes.toLocaleString()}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-400">Current documentation hours</span>
                <span className="font-semibold">{result.currentHours.toLocaleString()} hrs</span>
              </div>
              <div className="mt-4 h-3 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-aria-gradient rounded-full chart-bar-pop" style={{ width: `${Math.min(result.reduction, 96)}%` }} />
              </div>
              <p className="mt-3 text-sm text-aria-100">
                Estimated {result.reduction}% documentation-time reduction if average note handling drops to 3 minutes.
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                Calculator uses editable assumptions, not a guarantee. It is designed to help providers estimate the size of the documentation problem.
              </p>
            </div>

            <Link href="/signup?plan=growth" className="mt-5 btn-primary w-full justify-center">
              Start a provider trial <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

import { Info } from "lucide-react";

// Lightweight, dependency-free chart primitives for the provider trend views.
// Deliberately non-clinical: these show activity/themes recorded in notes, not
// outcomes or diagnoses.

export function SectionCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-display font-bold text-slate-900 text-sm">{title}</h3>
        {hint && (
          <span className="flex items-center gap-1 text-[10px] text-slate-400 max-w-[55%] text-right leading-tight">
            <Info className="w-3 h-3 flex-shrink-0" /> {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function StatTile({ label, value, sub, tone = "teal" }: { label: string; value: React.ReactNode; sub?: string; tone?: "teal" | "amber" | "red" | "slate" }) {
  const toneClass = tone === "amber" ? "text-amber-600" : tone === "red" ? "text-red-600" : tone === "slate" ? "text-slate-700" : "text-aria-600";
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`font-display text-3xl font-bold mt-1 ${toneClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export function VerticalBars({ series }: { series: Array<{ label: string; value: number }> }) {
  const max = Math.max(...series.map((s) => s.value), 1);
  if (series.every((s) => s.value === 0)) {
    return <EmptyChart />;
  }
  return (
    <div className="flex items-end gap-2 h-40">
      {series.map((s) => (
        <div key={s.label} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-bold text-slate-600">{s.value > 0 ? s.value : ""}</span>
          <div
            className="w-full rounded-t-lg bg-aria-gradient transition-all"
            style={{ height: `${Math.max((s.value / max) * 120, s.value > 0 ? 6 : 3)}px` }}
            title={`${s.label}: ${s.value}`}
          />
          <span className="text-[10px] text-slate-400 truncate w-full text-center">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

export function BarList({ items, emptyLabel }: { items: Array<{ label: string; value: number; tone?: string }>; emptyLabel?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  if (!items.length || items.every((i) => i.value === 0)) {
    return <EmptyChart label={emptyLabel} />;
  }
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-28 text-xs font-medium text-slate-600 truncate capitalize" title={item.label}>{item.label}</div>
          <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden relative">
            <div
              className={`h-full rounded-lg ${item.tone ?? "bg-aria-500"}`}
              style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0)}%` }}
            />
            <span className="absolute inset-0 flex items-center px-2 text-[11px] font-semibold text-slate-600">{item.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MiniBars({ series }: { series: number[] }) {
  const max = Math.max(...series, 1);
  return (
    <div className="flex items-end gap-0.5 h-8" aria-hidden>
      {series.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm bg-aria-400/70" style={{ height: `${Math.max((v / max) * 100, v > 0 ? 12 : 4)}%` }} />
      ))}
    </div>
  );
}

export function EmptyChart({ label }: { label?: string }) {
  return (
    <div className="h-24 flex items-center justify-center text-center rounded-xl border border-dashed border-slate-200">
      <p className="text-xs text-slate-400">{label ?? "No matching notes in this range yet."}</p>
    </div>
  );
}

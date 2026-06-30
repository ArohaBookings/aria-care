"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";

interface Option { id: string; label: string }

export default function InsightsFilterBar({
  participants,
  workers,
  supportTypes,
}: {
  participants: Option[];
  workers: Option[];
  supportTypes: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const get = (k: string) => params.get(k) ?? "";

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  };

  const toggle = (key: string) => update(key, get(key) === "1" ? "" : "1");

  const hasFilters = ["range", "participant", "worker", "type", "incident", "followup"].some((k) => get(k));

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Date range</label>
          <select value={get("range") || "90"} onChange={(e) => update("range", e.target.value === "90" ? "" : e.target.value)} className="input min-w-[8rem]">
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last 12 months</option>
            <option value="all">All time</option>
          </select>
        </div>

        <div>
          <label className="label">Participant</label>
          <select value={get("participant")} onChange={(e) => update("participant", e.target.value)} className="input min-w-[9rem]">
            <option value="">All participants</option>
            {participants.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Worker</label>
          <select value={get("worker")} onChange={(e) => update("worker", e.target.value)} className="input min-w-[9rem]">
            <option value="">All workers</option>
            {workers.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
          </select>
        </div>

        {supportTypes.length > 0 && (
          <div>
            <label className="label">Support type</label>
            <select value={get("type")} onChange={(e) => update("type", e.target.value)} className="input min-w-[9rem]">
              <option value="">All types</option>
              {supportTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}

        <button
          onClick={() => toggle("incident")}
          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${get("incident") === "1" ? "bg-red-50 border-red-200 text-red-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
        >
          Incident/behaviour notes
        </button>

        <button
          onClick={() => toggle("followup")}
          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${get("followup") === "1" ? "bg-amber-50 border-amber-200 text-amber-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
        >
          Follow-up required
        </button>

        {hasFilters && (
          <button onClick={() => router.push(pathname)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>
    </div>
  );
}

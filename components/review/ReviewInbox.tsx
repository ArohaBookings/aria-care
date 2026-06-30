"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, AlertTriangle, Inbox } from "lucide-react";

export interface ReviewItem {
  id: string;
  participantId: string | null;
  participant: string;
  date: string;
  author: string;
  snippet: string;
  incident: boolean;
}

export default function ReviewInbox({ items }: { items: ReviewItem[] }) {
  const [pending, setPending] = useState(items);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const approve = async (id: string) => {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/notes/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: id, action: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not approve");
      setPending((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not approve");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-aria-600" />
          <h3 className="font-display font-bold text-slate-900 text-sm">Review inbox</h3>
          {pending.length > 0 && <span className="badge text-[10px] bg-amber-50 text-amber-700">{pending.length} pending</span>}
        </div>
        <Link href="/notes?status=pending" className="text-xs text-aria-600 font-semibold hover:underline">Open notes →</Link>
      </div>

      {pending.length === 0 ? (
        <div className="p-8 text-center">
          <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500">All caught up — no notes waiting for review.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {error && <p className="px-5 py-2 text-xs text-red-600">{error}</p>}
          {pending.map((n) => (
            <div key={n.id} className="px-5 py-3.5 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {n.participantId ? (
                    <Link href={`/participants/${n.participantId}`} className="text-sm font-semibold text-slate-900 hover:text-aria-700">{n.participant}</Link>
                  ) : (
                    <span className="text-sm font-semibold text-slate-900">{n.participant}</span>
                  )}
                  {n.incident && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600"><AlertTriangle className="w-3 h-3" /> Incident</span>}
                  <span className="text-[11px] text-slate-400">{n.date} · {n.author}</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 mt-1">{n.snippet}</p>
              </div>
              <button onClick={() => approve(n.id)} disabled={busyId === n.id} className="btn-primary text-xs py-1.5 px-3 flex-shrink-0 disabled:opacity-50">
                {busyId === n.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

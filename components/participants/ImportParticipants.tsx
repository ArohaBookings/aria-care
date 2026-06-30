"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Loader2, Check, X } from "lucide-react";

interface Row { full_name: string; ndis_number?: string; support_category?: string; primary_disability?: string; goals?: string }

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (c === "," && !q) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function mapKey(header: string): string {
  if (/full.?name|^name$/.test(header)) return "full_name";
  if (/ndis/.test(header)) return "ndis_number";
  if (/category|support/.test(header)) return "support_category";
  if (/disab/.test(header)) return "primary_disability";
  if (/goal/.test(header)) return "goals";
  return header;
}

function parseCSV(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const firstCols = splitLine(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = firstCols.some((h) => /name|ndis|category|disab|goal/.test(h));
  const cols = (hasHeader ? firstCols : ["full_name", "ndis_number", "support_category", "primary_disability", "goals"]).map(mapKey);
  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines
    .map((l) => {
      const cells = splitLine(l);
      const row: Record<string, string> = {};
      cols.forEach((c, i) => { row[c] = cells[i] ?? ""; });
      return row as unknown as Row;
    })
    .filter((r) => (r.full_name ?? "").trim().length > 0);
}

export default function ImportParticipants() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const rows = parseCSV(text);

  const onFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const doImport = async () => {
    if (!rows.length) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/participants/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      const skipped = data.skippedOverLimit ? ` (${data.skippedOverLimit} skipped — plan limit ${data.limit})` : "";
      setResult({ ok: true, message: `Imported ${data.created} participant${data.created === 1 ? "" : "s"}${skipped}.` });
      setText("");
      router.refresh();
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : "Import failed" });
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary">
        <Upload className="w-4 h-4" /> Import CSV
      </button>
    );
  }

  return (
    <div className="card p-5 w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-bold text-slate-900 text-sm flex items-center gap-1.5"><Upload className="w-4 h-4 text-aria-600" /> Import participants from CSV</h3>
        <button onClick={() => { setOpen(false); setResult(null); }} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
      </div>
      <p className="text-[11px] text-slate-500 mb-3">Columns (header optional): <code>full_name, ndis_number, support_category, primary_disability, goals</code>. Separate multiple goals with <code>;</code></p>
      <label className="btn-secondary text-xs cursor-pointer inline-flex mb-2">
        <FileText className="w-4 h-4" /> Choose .csv file
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="input resize-y text-xs font-mono leading-relaxed"
        placeholder={"full_name,ndis_number,support_category,goals\nJordan Lee,430123456,Daily Activities,independent cooking; catch the bus\nSam Patel,430999111,Social Participation,join a local group"}
      />
      <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
        <p className="text-xs text-slate-500">{rows.length} valid row{rows.length === 1 ? "" : "s"} detected</p>
        <button onClick={doImport} disabled={busy || rows.length === 0} className="btn-primary text-sm disabled:opacity-50">
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</> : <><Upload className="w-4 h-4" /> Import {rows.length || ""}</>}
        </button>
      </div>
      {result && (
        <p className={`mt-3 text-xs flex items-center gap-1.5 ${result.ok ? "text-emerald-700" : "text-red-600"}`}>
          {result.ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} {result.message}
        </p>
      )}
    </div>
  );
}

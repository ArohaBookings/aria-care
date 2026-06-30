"use client";

import { useState } from "react";
import { Copy, Download, Printer, Check } from "lucide-react";

export default function ExportButtons({
  rows,
  filename,
  summaryText,
}: {
  rows: Array<Record<string, string | number>>;
  filename: string;
  summaryText: string;
}) {
  const [copied, setCopied] = useState(false);

  const downloadCsv = () => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard may be blocked; no-op
    }
  };

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button onClick={copy} className="btn-secondary text-xs">
        {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy summary</>}
      </button>
      <button onClick={downloadCsv} disabled={!rows.length} className="btn-secondary text-xs disabled:opacity-50">
        <Download className="w-4 h-4" /> Download CSV
      </button>
      <button onClick={() => window.print()} className="btn-secondary text-xs">
        <Printer className="w-4 h-4" /> Print
      </button>
    </div>
  );
}

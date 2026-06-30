"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary text-sm print:hidden">
      <Printer className="w-4 h-4" /> Print / Save as PDF
    </button>
  );
}

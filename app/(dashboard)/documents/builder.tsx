"use client";
import { useState } from "react";
import { FileText, AlertTriangle, ClipboardList, Mail, Loader2, Sparkles, Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui/toast";

type DocType = "support_plan" | "incident_report" | "handover_note" | "email";
type Participant = { id: string; full_name: string };

const TABS: { value: DocType; label: string; icon: typeof FileText; description: string }[] = [
  { value: "support_plan", label: "Support Plan", icon: FileText, description: "NDIS-compliant participant support plan" },
  { value: "incident_report", label: "Incident Report", icon: AlertTriangle, description: "Structured incident report with severity" },
  { value: "handover_note", label: "Handover Note", icon: ClipboardList, description: "Shift handover from notes" },
  { value: "email", label: "Email Draft", icon: Mail, description: "Professional email from a brief" },
];

export default function DocumentsBuilder({ participants }: { participants: Participant[] }) {
  const toast = useToast();
  const [tab, setTab] = useState<DocType>("support_plan");
  const [participantId, setParticipantId] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const generate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tab, participantId: participantId || undefined, data: form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");
      setResult(json.result);
      toast.success("Document generated", "Review the draft below and copy or save as needed.");
    } catch (e) {
      toast.error("Generation failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resultText = formatResult(result);
  const canGenerate = !loading && (
    (tab === "support_plan" && !!participantId) ||
    (tab === "incident_report" && !!form.description?.trim()) ||
    (tab === "handover_note" && !!form.notes?.trim()) ||
    (tab === "email" && !!form.context?.trim())
  );

  const copy = async () => {
    if (!resultText) return;
    await navigator.clipboard.writeText(resultText);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      {/* Tabs */}
      <div className="space-y-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => { setTab(t.value); setForm({}); setResult(null); }}
              className={`w-full text-left card p-4 transition-all ${active ? "border-aria-300 bg-aria-50/50" : "hover:border-slate-300"}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? "bg-aria-gradient text-white" : "bg-slate-100 text-slate-600"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${active ? "text-aria-700" : "text-slate-900"}`}>{t.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{t.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Form + result */}
      <div className="space-y-5">
        <div className="card p-6">
          {/* Shared participant picker for types that use it */}
          {(tab === "support_plan" || tab === "incident_report" || tab === "handover_note") && (
            <div className="mb-4">
              <label className="label">Participant {tab === "support_plan" && <span className="text-red-500">*</span>}</label>
              <select value={participantId} onChange={(e) => setParticipantId(e.target.value)} className="input">
                <option value="">{tab === "support_plan" ? "Select participant…" : "Optional — select participant"}</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>
          )}

          {tab === "support_plan" && (
            <>
              <Field label="Participant goals (optional)" value={form.participantGoals ?? ""} onChange={(v) => update("participantGoals", v)} placeholder="E.g. build independence with meal prep, maintain social connections…" />
              <Field label="Current supports (optional)" value={form.currentSupports ?? ""} onChange={(v) => update("currentSupports", v)} placeholder="E.g. 10hrs/week SIL, OT fortnightly…" />
              <Field label="Living arrangement (optional)" value={form.livingArrangement ?? ""} onChange={(v) => update("livingArrangement", v)} placeholder="E.g. lives with family, SDA 2-bed…" />
            </>
          )}

          {tab === "incident_report" && (
            <Field
              label="What happened?"
              required
              rows={5}
              value={form.description ?? ""}
              onChange={(v) => update("description", v)}
              placeholder="Describe the incident in plain English — when, where, who was involved, what occurred, and what actions were taken…"
            />
          )}

          {tab === "handover_note" && (
            <Field
              label="Shift notes"
              required
              rows={6}
              value={form.notes ?? ""}
              onChange={(v) => update("notes", v)}
              placeholder="Key observations, activities, mood, medications, anything the next shift needs to know…"
            />
          )}

          {tab === "email" && (
            <Field
              label="What do you want to say?"
              required
              rows={5}
              value={form.context ?? ""}
              onChange={(v) => update("context", v)}
              placeholder="E.g. Email the plan manager to request approval for additional core supports for Sarah due to increased support needs after her recent hospitalisation…"
            />
          )}

          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-slate-500">Generated by Aria AI · review before sharing</p>
            <button onClick={generate} disabled={!canGenerate} className="btn-primary py-2.5 px-5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate
            </button>
          </div>
        </div>

        {resultText && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-sm">Draft</h3>
              <button onClick={copy} className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-aria-600 transition-colors">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="p-5 text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed max-h-[600px] overflow-y-auto">
              {resultText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, required, rows = 3,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; rows?: number;
}) {
  return (
    <div className="mb-4">
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="input resize-y"
      />
    </div>
  );
}

function formatResult(result: unknown): string {
  if (!result) return "";
  if (typeof result === "string") return result;
  if (typeof result === "object" && result !== null) {
    const r = result as Record<string, unknown>;
    // Prefer a flat text field if the model returns one
    if (typeof r.text === "string") return r.text;
    if (typeof r.body === "string") return r.body;
    if (typeof r.content === "string") return r.content;
    // Otherwise, render as readable labelled sections
    return Object.entries(r)
      .map(([k, v]) => {
        const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const val = typeof v === "string" ? v : Array.isArray(v) ? v.map(String).join("\n• ") : JSON.stringify(v, null, 2);
        return `## ${label}\n${Array.isArray(v) ? "• " + val : val}`;
      })
      .join("\n\n");
  }
  return String(result);
}

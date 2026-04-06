"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Check } from "lucide-react";

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "coordinator", label: "Coordinator" },
  { value: "support_worker", label: "Support Worker" },
];

export default function StaffControls({
  staffId,
  initialRole,
  initialActive,
}: {
  staffId: string;
  initialRole: string;
  initialActive: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState(initialRole);
  const [active, setActive] = useState(initialActive);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setSaving(true);
    setErr("");
    setSaved(false);

    const res = await fetch(`/api/staff/${staffId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, is_active: active }),
    });
    const data = await res.json();

    setSaving(false);
    if (!res.ok) {
      setErr(data.error ?? "Could not update staff member");
    } else {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <p className="section-title">Manage role</p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <label className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="accent-aria-600"
            />
            <span className="text-sm">{active ? "Active" : "Disabled"}</span>
          </label>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary py-2.5 px-5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save changes
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>
      {err && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</div>}
    </div>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Check, Send } from "lucide-react";

export default function InviteStaffPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("support_worker");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/staff/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, full_name: name, role }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); }
    else { setDone(true); setLoading(false); }
  };

  return (
    <div className="p-6 max-w-lg">
      <Link href="/staff" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to staff
      </Link>
      <div className="card p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-aria-50 border border-aria-100 flex items-center justify-center">
            <Send className="w-5 h-5 text-aria-600" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">Invite Team Member</h2>
            <p className="text-sm text-slate-500">They&apos;ll receive an email to set up their account.</p>
          </div>
        </div>

        {done ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Invite sent!</h3>
            <p className="text-sm text-slate-500 mb-5">An invitation email has been sent to {email}.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/staff" className="btn-primary">Back to staff</Link>
              <button onClick={() => { setDone(false); setEmail(""); setName(""); }} className="btn-secondary">Invite another</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="label">Full name <span className="text-red-500">*</span></label><input value={name} onChange={e => setName(e.target.value)} required className="input" placeholder="Jane Smith" /></div>
            <div><label className="label">Email address <span className="text-red-500">*</span></label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input" placeholder="jane@yourorg.com.au" /></div>
            <div>
              <label className="label">Role</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="input">
                <option value="support_worker">Support Worker — can create notes, view own shifts</option>
                <option value="coordinator">Coordinator — can approve notes, manage participants</option>
              </select>
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary py-3 px-7">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send invite</>}
              </button>
              <Link href="/staff" className="btn-secondary py-3 px-5">Cancel</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

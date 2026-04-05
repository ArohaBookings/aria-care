"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const SUPPORT_CATEGORIES = [
  "Daily Life", "Daily Activities", "Social & Community", "Transport",
  "Capacity Building", "Support Coordination", "Improved Living Arrangements",
  "Assistive Technology", "Home Modifications", "Improved Health & Wellbeing",
];

export default function NewParticipantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    full_name: "", ndis_number: "", date_of_birth: "", email: "",
    phone: "", address: "", support_category: "Daily Activities",
    plan_start_date: "", plan_end_date: "", plan_budget: "",
    primary_disability: "", emergency_contact_name: "", emergency_contact_phone: "",
    notes: "",
  });

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("users").select("organisation_id").eq("id", user!.id).single();
    const { error: err } = await supabase.from("participants").insert({
      ...form,
      organisation_id: profile?.organisation_id,
      plan_budget: form.plan_budget ? parseFloat(form.plan_budget) : null,
      status: "active",
      funding_remaining_pct: 100,
    });
    if (err) { setError(err.message); setLoading(false); }
    else router.push("/participants");
  };

  const Field = ({ label, name, type = "text", placeholder = "", required = false, className = "" }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean; className?: string }) => (
    <div className={className}>
      <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input type={type} value={(form as Record<string, string>)[name]} onChange={e => update(name, e.target.value)} required={required} placeholder={placeholder} className="input" />
    </div>
  );

  return (
    <div className="p-6 max-w-3xl">
      <Link href="/participants" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to participants
      </Link>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-aria-50 border border-aria-100 flex items-center justify-center">
          <User className="w-5 h-5 text-aria-600" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">Add Participant</h2>
          <p className="text-sm text-slate-500">Fill in the details below to create a new participant profile.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal details */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Personal Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full Name" name="full_name" required placeholder="Marcus Thompson" />
            <Field label="NDIS Number" name="ndis_number" placeholder="430 123 456" />
            <Field label="Date of Birth" name="date_of_birth" type="date" />
            <Field label="Primary Disability" name="primary_disability" placeholder="e.g. Autism Spectrum Disorder" />
            <Field label="Email" name="email" type="email" placeholder="participant@email.com" />
            <Field label="Phone" name="phone" placeholder="+61 400 000 000" />
          </div>
          <div className="mt-4">
            <label className="label">Address</label>
            <input value={form.address} onChange={e => update("address", e.target.value)} placeholder="123 Care Street, Melbourne VIC 3000" className="input" />
          </div>
        </div>

        {/* NDIS Plan */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">NDIS Plan Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Support Category</label>
              <select value={form.support_category} onChange={e => update("support_category", e.target.value)} className="input">
                {SUPPORT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <Field label="Total Plan Budget ($)" name="plan_budget" type="number" placeholder="45000" />
            <Field label="Plan Start Date" name="plan_start_date" type="date" />
            <Field label="Plan End Date" name="plan_end_date" type="date" />
          </div>
        </div>

        {/* Emergency contact */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Contact Name" name="emergency_contact_name" placeholder="Sarah Thompson" />
            <Field label="Contact Phone" name="emergency_contact_phone" placeholder="+61 400 000 001" />
          </div>
        </div>

        {/* Notes */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Additional Notes</h3>
          <textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} placeholder="Any important context for support workers..." className="input resize-none" />
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary py-3 px-7">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Add Participant"}
          </button>
          <Link href="/participants" className="btn-secondary py-3 px-7">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, User, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const SUPPORT_CATEGORIES = [
  "Daily Life", "Daily Activities", "Social & Community", "Transport",
  "Capacity Building", "Support Coordination", "Improved Living Arrangements",
  "Assistive Technology", "Home Modifications", "Improved Health & Wellbeing",
];

type FormState = {
  full_name: string;
  preferred_name: string;
  ndis_number: string;
  date_of_birth: string;
  email: string;
  phone: string;
  address: string;
  support_category: string;
  plan_start_date: string;
  plan_end_date: string;
  plan_budget: string;
  primary_disability: string;
  support_needs: string;
  living_arrangement: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  funding_remaining_pct: string;
  status: string;
  notes: string;
};

const EMPTY: FormState = {
  full_name: "", preferred_name: "", ndis_number: "", date_of_birth: "", email: "",
  phone: "", address: "", support_category: "Daily Activities",
  plan_start_date: "", plan_end_date: "", plan_budget: "",
  primary_disability: "", support_needs: "", living_arrangement: "",
  emergency_contact_name: "", emergency_contact_phone: "",
  funding_remaining_pct: "100", status: "active", notes: "",
};

export default function EditParticipantPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const supabase = createClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error: fetchErr } = await supabase
        .from("participants")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchErr || !data) {
        setError(fetchErr?.message || "Participant not found");
        setFetching(false);
        return;
      }
      setForm({
        full_name: data.full_name ?? "",
        preferred_name: data.preferred_name ?? "",
        ndis_number: data.ndis_number ?? "",
        date_of_birth: data.date_of_birth ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        address: data.address ?? "",
        support_category: data.support_category ?? "Daily Activities",
        plan_start_date: data.plan_start_date ?? "",
        plan_end_date: data.plan_end_date ?? "",
        plan_budget: data.plan_budget?.toString() ?? "",
        primary_disability: data.primary_disability ?? "",
        support_needs: data.support_needs ?? "",
        living_arrangement: data.living_arrangement ?? "",
        emergency_contact_name: data.emergency_contact_name ?? "",
        emergency_contact_phone: data.emergency_contact_phone ?? "",
        funding_remaining_pct: data.funding_remaining_pct?.toString() ?? "100",
        status: data.status ?? "active",
        notes: data.notes ?? "",
      });
      setFetching(false);
    })();
  }, [id, supabase]);

  const update = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: updErr } = await supabase
      .from("participants")
      .update({
        ...form,
        plan_budget: form.plan_budget ? parseFloat(form.plan_budget) : null,
        funding_remaining_pct: form.funding_remaining_pct ? parseFloat(form.funding_remaining_pct) : 100,
        date_of_birth: form.date_of_birth || null,
        plan_start_date: form.plan_start_date || null,
        plan_end_date: form.plan_end_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (updErr) {
      setError(updErr.message);
      setLoading(false);
    } else {
      router.push(`/participants/${id}`);
      router.refresh();
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Delete this participant? This will also delete all their progress notes, incident reports, and support plans. This cannot be undone."
    );
    if (!confirmed) return;
    setDeleting(true);
    const { error: delErr } = await supabase.from("participants").delete().eq("id", id);
    if (delErr) {
      setError(delErr.message);
      setDeleting(false);
    } else {
      router.push("/participants");
      router.refresh();
    }
  };

  if (fetching) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <Link href={`/participants/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to participant
      </Link>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-aria-50 border border-aria-100 flex items-center justify-center">
          <User className="w-5 h-5 text-aria-600" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">Edit participant</h2>
          <p className="text-sm text-slate-500">Update details below and save your changes.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Personal Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name <span className="text-red-500">*</span></label>
              <input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} required className="input" />
            </div>
            <div>
              <label className="label">Preferred name</label>
              <input value={form.preferred_name} onChange={(e) => update("preferred_name", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">NDIS Number</label>
              <input value={form.ndis_number} onChange={(e) => update("ndis_number", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Primary Disability</label>
              <input value={form.primary_disability} onChange={(e) => update("primary_disability", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={(e) => update("status", e.target.value)} className="input">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="input" />
            </div>
          </div>
          <div className="mt-4">
            <label className="label">Address</label>
            <input value={form.address} onChange={(e) => update("address", e.target.value)} className="input" />
          </div>
          <div className="mt-4">
            <label className="label">Living arrangement</label>
            <input value={form.living_arrangement} onChange={(e) => update("living_arrangement", e.target.value)} className="input" placeholder="e.g. Supported Independent Living" />
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">NDIS Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Support Category</label>
              <select value={form.support_category} onChange={(e) => update("support_category", e.target.value)} className="input">
                {SUPPORT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Total Plan Budget ($)</label>
              <input type="number" value={form.plan_budget} onChange={(e) => update("plan_budget", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Plan Start Date</label>
              <input type="date" value={form.plan_start_date} onChange={(e) => update("plan_start_date", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Plan End Date</label>
              <input type="date" value={form.plan_end_date} onChange={(e) => update("plan_end_date", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Funding remaining (%)</label>
              <input type="number" min="0" max="100" value={form.funding_remaining_pct} onChange={(e) => update("funding_remaining_pct", e.target.value)} className="input" />
            </div>
          </div>
          <div className="mt-4">
            <label className="label">Support needs</label>
            <textarea value={form.support_needs} onChange={(e) => update("support_needs", e.target.value)} rows={3} className="input resize-none" />
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <input value={form.emergency_contact_name} onChange={(e) => update("emergency_contact_name", e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input value={form.emergency_contact_phone} onChange={(e) => update("emergency_contact_phone", e.target.value)} className="input" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Additional Notes</h3>
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className="input resize-none" />
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

        <div className="flex flex-wrap gap-3 justify-between">
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary py-3 px-7">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save changes"}
            </button>
            <Link href={`/participants/${id}`} className="btn-secondary py-3 px-7">Cancel</Link>
          </div>
          <button type="button" onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl border border-red-100 transition-colors disabled:opacity-50">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete participant
          </button>
        </div>
      </form>
    </div>
  );
}

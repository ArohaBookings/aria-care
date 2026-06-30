"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Loader2, User } from "lucide-react";

const SUPPORT_CATEGORIES = [
  "Daily Life", "Daily Activities", "Social & Community", "Transport",
  "Capacity Building", "Support Coordination", "Improved Living Arrangements",
  "Assistive Technology", "Home Modifications", "Improved Health & Wellbeing",
];

type FormState = {
  full_name: string;
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
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;
type FieldName = keyof FormState;

const EMPTY_FORM: FormState = {
  full_name: "", ndis_number: "", date_of_birth: "", email: "",
  phone: "", address: "", support_category: "Daily Activities",
  plan_start_date: "", plan_end_date: "", plan_budget: "",
  primary_disability: "", emergency_contact_name: "", emergency_contact_phone: "",
  notes: "",
};

const FIELD_LABELS: Partial<Record<FieldName, string>> = {
  full_name: "Full Name",
  email: "Email",
  plan_budget: "Total Plan Budget",
  plan_start_date: "Plan Start Date",
  plan_end_date: "Plan End Date",
};

function validateParticipantForm(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  const email = form.email.trim();
  const budget = form.plan_budget.trim();

  if (!form.full_name.trim()) {
    errors.full_name = "Enter the participant's full name.";
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address, or leave this blank.";
  }

  if (budget) {
    const parsedBudget = Number(budget);
    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
      errors.plan_budget = "Plan budget must be a valid amount of 0 or more.";
    }
  }

  if (form.plan_start_date && form.plan_end_date && form.plan_end_date < form.plan_start_date) {
    errors.plan_end_date = "Plan end date must be after the plan start date.";
  }

  return errors;
}

function toApiPayload(form: FormState) {
  return {
    ...form,
    full_name: form.full_name.trim(),
    email: form.email.trim() || null,
    date_of_birth: form.date_of_birth || null,
    plan_start_date: form.plan_start_date || null,
    plan_end_date: form.plan_end_date || null,
    plan_budget: form.plan_budget.trim() ? Number(form.plan_budget) : null,
  };
}

function buildErrorMessage(errors: FieldErrors) {
  const first = Object.entries(errors)[0] as [FieldName, string] | undefined;
  if (!first) return "Please fix the highlighted participant details before saving.";
  return `${FIELD_LABELS[first[0]] ?? "This field"}: ${first[1]}`;
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  error,
  className = "",
  inputRef,
}: {
  label: string;
  name: FieldName;
  value: string;
  onChange: (name: FieldName, value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
  inputRef?: (node: HTMLInputElement | null) => void;
}) {
  const errorId = `${name}-error`;

  return (
    <div className={className}>
      {error && <p className="mb-1 text-xs font-bold text-red-600">* Fix this</p>}
      <label className="label" htmlFor={name}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        ref={inputRef}
        id={name}
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`input ${error ? "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-500/20" : ""}`}
      />
      {error && <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export default function NewParticipantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [upgradeHref, setUpgradeHref] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const fieldRefs = useRef<Partial<Record<FieldName, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>>>({});

  const update = (k: FieldName, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setError("");
    setUpgradeHref("");
    setFieldErrors((current) => {
      if (!current[k]) return current;
      const next = { ...current };
      delete next[k];
      return next;
    });
  };

  const focusFirstError = (errors: FieldErrors) => {
    const firstField = Object.keys(errors)[0] as FieldName | undefined;
    if (!firstField) return;
    requestAnimationFrame(() => fieldRefs.current[firstField]?.focus());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUpgradeHref("");

    const clientErrors = validateParticipantForm(form);
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      setError(buildErrorMessage(clientErrors));
      focusFirstError(clientErrors);
      return;
    }

    setLoading(true);
    setFieldErrors({});
    const res = await fetch("/api/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toApiPayload(form)),
    });
    const data = await res.json();
    if (!res.ok) {
      const apiFieldErrors = (data.fieldErrors ?? {}) as FieldErrors;
      setFieldErrors(apiFieldErrors);
      setError(data.error ?? buildErrorMessage(apiFieldErrors) ?? "Participant could not be added. Please check the highlighted fields.");
      setUpgradeHref(data.upgradeUrl ?? "");
      focusFirstError(apiFieldErrors);
      setLoading(false);
      return;
    }
    router.push("/participants");
    router.refresh();
  };

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

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Personal details */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Personal Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full Name" name="full_name" value={form.full_name} onChange={update} required placeholder="Marcus Thompson" error={fieldErrors.full_name} inputRef={(node) => { fieldRefs.current.full_name = node; }} />
            <Field label="NDIS Number" name="ndis_number" value={form.ndis_number} onChange={update} placeholder="430 123 456" error={fieldErrors.ndis_number} inputRef={(node) => { fieldRefs.current.ndis_number = node; }} />
            <Field label="Date of Birth" name="date_of_birth" value={form.date_of_birth} onChange={update} type="date" error={fieldErrors.date_of_birth} inputRef={(node) => { fieldRefs.current.date_of_birth = node; }} />
            <Field label="Primary Disability" name="primary_disability" value={form.primary_disability} onChange={update} placeholder="e.g. Autism Spectrum Disorder" error={fieldErrors.primary_disability} inputRef={(node) => { fieldRefs.current.primary_disability = node; }} />
            <Field label="Email" name="email" value={form.email} onChange={update} type="email" placeholder="participant@email.com" error={fieldErrors.email} inputRef={(node) => { fieldRefs.current.email = node; }} />
            <Field label="Phone" name="phone" value={form.phone} onChange={update} placeholder="+61 400 000 000" error={fieldErrors.phone} inputRef={(node) => { fieldRefs.current.phone = node; }} />
          </div>
          <div className="mt-4">
            {fieldErrors.address && <p className="mb-1 text-xs font-bold text-red-600">* Fix this</p>}
            <label className="label" htmlFor="address">Address</label>
            <input id="address" ref={(node) => { fieldRefs.current.address = node; }} value={form.address} onChange={e => update("address", e.target.value)} placeholder="123 Care Street, Melbourne VIC 3000" className={`input ${fieldErrors.address ? "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-500/20" : ""}`} />
            {fieldErrors.address && <p className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors.address}</p>}
          </div>
        </div>

        {/* NDIS Plan */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">NDIS Plan Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {fieldErrors.support_category && <p className="mb-1 text-xs font-bold text-red-600">* Fix this</p>}
              <label className="label" htmlFor="support_category">Support Category</label>
              <select id="support_category" ref={(node) => { fieldRefs.current.support_category = node; }} value={form.support_category} onChange={e => update("support_category", e.target.value)} className={`input ${fieldErrors.support_category ? "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-500/20" : ""}`}>
                {SUPPORT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              {fieldErrors.support_category && <p className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors.support_category}</p>}
            </div>
            <Field label="Total Plan Budget ($)" name="plan_budget" value={form.plan_budget} onChange={update} type="number" placeholder="45000" error={fieldErrors.plan_budget} inputRef={(node) => { fieldRefs.current.plan_budget = node; }} />
            <Field label="Plan Start Date" name="plan_start_date" value={form.plan_start_date} onChange={update} type="date" error={fieldErrors.plan_start_date} inputRef={(node) => { fieldRefs.current.plan_start_date = node; }} />
            <Field label="Plan End Date" name="plan_end_date" value={form.plan_end_date} onChange={update} type="date" error={fieldErrors.plan_end_date} inputRef={(node) => { fieldRefs.current.plan_end_date = node; }} />
          </div>
        </div>

        {/* Emergency contact */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Contact Name" name="emergency_contact_name" value={form.emergency_contact_name} onChange={update} placeholder="Sarah Thompson" error={fieldErrors.emergency_contact_name} inputRef={(node) => { fieldRefs.current.emergency_contact_name = node; }} />
            <Field label="Contact Phone" name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={update} placeholder="+61 400 000 001" error={fieldErrors.emergency_contact_phone} inputRef={(node) => { fieldRefs.current.emergency_contact_phone = node; }} />
          </div>
        </div>

        {/* Notes */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Additional Notes</h3>
          {fieldErrors.notes && <p className="mb-1 text-xs font-bold text-red-600">* Fix this</p>}
          <textarea ref={(node) => { fieldRefs.current.notes = node; }} value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} placeholder="Any important context for support workers..." className={`input resize-none ${fieldErrors.notes ? "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-500/20" : ""}`} />
          {fieldErrors.notes && <p className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors.notes}</p>}
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="flex items-start gap-2 font-semibold"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}</p>
            {upgradeHref && (
              <Link href={upgradeHref} className="mt-2 inline-flex font-semibold text-red-700 hover:text-red-800">
                Upgrade plan
              </Link>
            )}
          </div>
        )}

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

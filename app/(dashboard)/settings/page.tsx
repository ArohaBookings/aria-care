"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Settings, User, Bell, Loader2, Check, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Tab = "profile" | "organisation" | "notifications";

const NOTIFICATION_KEYS = [
  { key: "compliance_expiry", label: "Compliance item expiring (30 days)", desc: "Get notified when staff certifications are approaching expiry" },
  { key: "plan_review", label: "Participant plan review due (60 days)", desc: "Reminder when a participant's NDIS plan review is approaching" },
  { key: "pending_notes_digest", label: "Pending notes daily digest", desc: "Daily summary of progress notes awaiting your approval" },
  { key: "incident_submitted", label: "Incident report submitted", desc: "Notify coordinator when a support worker files an incident report" },
  { key: "funding_low", label: "Funding below 20%", desc: "Alert when a participant's funding drops below 20% remaining" },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) || "profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({ full_name: "", email: "" });
  const [org, setOrg] = useState({ name: "", abn: "", address: "", contact_email: "" });
  const [notifications, setNotifications] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: p } = await supabase.from("users").select("full_name, email, organisation_id, notification_preferences").eq("id", user.id).single();
      if (p) {
        setProfile({ full_name: p.full_name ?? "", email: user?.email ?? "" });
        const prefs = (p as unknown as { notification_preferences?: Record<string, boolean> }).notification_preferences ?? {};
        const defaulted: Record<string, boolean> = {};
        NOTIFICATION_KEYS.forEach(({ key }) => { defaulted[key] = prefs[key] ?? true; });
        setNotifications(defaulted);
      }
      if (p?.organisation_id) {
        const { data: o } = await supabase.from("organisations").select("name, abn, address, contact_email").eq("id", p.organisation_id).single();
        if (o) setOrg({ name: o.name ?? "", abn: o.abn ?? "", address: o.address ?? "", contact_email: o.contact_email ?? "" });
      }
      setLoading(false);
    })();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    await supabase.from("users").update({ full_name: profile.full_name }).eq("id", user.id);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  const handleSaveOrg = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: p } = await supabase.from("users").select("organisation_id").eq("id", user.id).single();
    if (p?.organisation_id) await supabase.from("organisations").update(org).eq("id", p.organisation_id);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    await supabase.from("users").update({ notification_preferences: notifications } as unknown as Record<string, unknown>).eq("id", user.id);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  const TABS = [
    { key: "profile" as Tab, label: "Profile", icon: User },
    { key: "organisation" as Tab, label: "Organisation", icon: Settings },
    { key: "notifications" as Tab, label: "Notifications", icon: Bell },
  ];

  if (loading) return <div className="p-6 flex items-center justify-center h-64"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="font-display text-2xl font-bold text-slate-900 mb-6">Settings</h2>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-7">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === key ? "bg-white text-slate-900 shadow-card" : "text-slate-500 hover:text-slate-700"}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-slate-900">Your Profile</h3>
          <div><label className="label">Full Name</label><input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} className="input" /></div>
          <div><label className="label">Email</label><input value={profile.email} disabled className="input opacity-60" /></div>
          <div className="pt-2">
            <button onClick={handleSaveProfile} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Saved!" : "Save changes"}
            </button>
          </div>
        </div>
      )}

      {tab === "organisation" && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-slate-900">Organisation Details</h3>
          <div><label className="label">Organisation Name</label><input value={org.name} onChange={e => setOrg(o => ({ ...o, name: e.target.value }))} className="input" /></div>
          <div><label className="label">ABN</label><input value={org.abn} onChange={e => setOrg(o => ({ ...o, abn: e.target.value }))} placeholder="12 345 678 901" className="input" /></div>
          <div><label className="label">Address</label><input value={org.address} onChange={e => setOrg(o => ({ ...o, address: e.target.value }))} placeholder="123 Care St, Melbourne VIC 3000" className="input" /></div>
          <div><label className="label">Contact Email</label><input type="email" value={org.contact_email} onChange={e => setOrg(o => ({ ...o, contact_email: e.target.value }))} className="input" /></div>
          <div className="pt-2">
            <button onClick={handleSaveOrg} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Saved!" : "Save changes"}
            </button>
          </div>
        </div>
      )}

      {tab === "notifications" && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-slate-900">Notification Preferences</h3>
          {NOTIFICATION_KEYS.map(({ key, label, desc }) => (
            <div key={key} className="flex items-start justify-between gap-4 py-3 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer mt-0.5">
                <input
                  type="checkbox"
                  checked={notifications[key] ?? true}
                  onChange={e => setNotifications(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-aria-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-aria-500" />
              </label>
            </div>
          ))}
          <div className="pt-2">
            <button onClick={handleSaveNotifications} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Saved!" : "Save preferences"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return <Suspense><SettingsContent /></Suspense>;
}

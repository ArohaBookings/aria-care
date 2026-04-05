"use client";
import { useState, useEffect } from "react";
import { Megaphone, Plus, Trash2, Loader2, CheckCircle, AlertCircle, Info } from "lucide-react";

interface Announcement { id: string; title: string; message: string; type: string; is_active: boolean; created_at: string; expires_at: string | null; }

const TYPE_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  info:     { color: "border-blue-500/30 bg-blue-900/20", icon: Info, label: "Info" },
  warning:  { color: "border-amber-500/30 bg-amber-900/20", icon: AlertCircle, label: "Warning" },
  critical: { color: "border-red-500/30 bg-red-900/20", icon: AlertCircle, label: "Critical" },
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({ title: "", message: "", type: "info", expires_at: "" });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const fetchAnnouncements = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/announcements");
    const data = await res.json();
    setAnnouncements(data.announcements ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...form }),
    });
    const data = await res.json();
    if (res.ok) { showToast("Announcement created"); setForm({ title: "", message: "", type: "info", expires_at: "" }); fetchAnnouncements(); }
    else showToast("Error: " + data.error);
    setSaving(false);
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    await fetch("/api/admin/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle", id, is_active: !is_active }) });
    fetchAnnouncements();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/admin/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    showToast("Announcement deleted");
    fetchAnnouncements();
  };

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Announcements</h1>
        <p className="text-slate-400 text-sm mt-0.5">Show banners to all users inside the dashboard</p>
      </div>

      {toast && <div className="px-4 py-3 bg-teal-900/30 border border-teal-500/30 text-teal-300 rounded-xl text-sm">{toast}</div>}

      {/* Create form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-teal-400" /> Create Announcement</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                placeholder="Scheduled maintenance this weekend"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Message</label>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required rows={3}
              placeholder="Full details of the announcement..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50 resize-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Expires (optional)</label>
            <input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50" />
          </div>
          <button type="submit" disabled={saving} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
            Publish Announcement
          </button>
        </form>
      </div>

      {/* Active announcements */}
      <div>
        <h3 className="font-semibold text-white mb-3">All Announcements</h3>
        {loading ? <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-slate-500 mx-auto" /></div> : (
          <div className="space-y-3">
            {announcements.map(ann => {
              const cfg = TYPE_CONFIG[ann.type] ?? TYPE_CONFIG.info;
              const Icon = cfg.icon;
              return (
                <div key={ann.id} className={`border rounded-2xl p-5 ${cfg.color} ${!ann.is_active ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-white text-sm">{ann.title}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{cfg.label}</span>
                          {ann.is_active ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-300">Active</span> : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">Inactive</span>}
                        </div>
                        <p className="text-sm text-slate-400">{ann.message}</p>
                        <p className="text-xs text-slate-600 mt-1">{new Date(ann.created_at).toLocaleString("en-AU")}{ann.expires_at ? ` · Expires ${new Date(ann.expires_at).toLocaleDateString("en-AU")}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleToggle(ann.id, ann.is_active)} className="text-xs border border-slate-600 text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:border-slate-500 transition-all">
                        {ann.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => handleDelete(ann.id)} className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!loading && announcements.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No announcements yet</p>}
          </div>
        )}
      </div>
    </div>
  );
}

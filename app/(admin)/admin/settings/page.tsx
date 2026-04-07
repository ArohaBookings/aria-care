"use client";
import { useState } from "react";
import { Shield, AlertTriangle, CheckCircle, Copy, ExternalLink } from "lucide-react";

export default function AdminSettingsPage() {
  const [copied, setCopied] = useState("");

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const SQL_MAKE_ADMIN = `-- Run in Supabase SQL Editor to make yourself admin:\nSELECT make_admin('your-email@example.com');`;
  const SQL_CHECK_ADMINS = `SELECT id, email, full_name, created_at, last_login_at, is_active FROM admin_users ORDER BY created_at;`;
  const SQL_REVOKE_ADMIN = `UPDATE admin_users SET is_active = false WHERE email = 'user@example.com';`;
  const SQL_COMPLIANCE_REFRESH = `SELECT update_compliance_status();`;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Admin Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Configuration, SQL helpers, and security info</p>
      </div>

      {/* Admin access */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-1 flex items-center gap-2"><Shield className="w-4 h-4 text-red-400" /> Admin Access Management</h3>
        <p className="text-sm text-slate-400 mb-5">Admin access is managed via the Supabase SQL Editor. Run these commands directly.</p>
        {[
          { label: "Grant admin access", sql: SQL_MAKE_ADMIN },
          { label: "List all admins", sql: SQL_CHECK_ADMINS },
          { label: "Revoke admin access", sql: SQL_REVOKE_ADMIN },
          { label: "Refresh compliance statuses", sql: SQL_COMPLIANCE_REFRESH },
        ].map(({ label, sql }) => (
          <div key={label} className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-slate-400">{label}</p>
              <button onClick={() => copy(sql, label)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-teal-400 transition-colors">
                {copied === label ? <CheckCircle className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === label ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-teal-300 font-mono overflow-x-auto whitespace-pre-wrap">{sql}</pre>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-4">Quick Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { label: "Supabase Dashboard", url: "https://supabase.com/dashboard", desc: "Database, auth, storage" },
            { label: "Stripe Dashboard", url: "https://dashboard.stripe.com", desc: "Payments, subscriptions" },
            { label: "Vercel Dashboard", url: "https://vercel.com/dashboard", desc: "Deployments, logs" },
            { label: "OpenAI Usage", url: "https://platform.openai.com/usage", desc: "API costs and usage" },
          ].map(({ label, url, desc }) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl px-4 py-3 transition-all group">
              <div>
                <p className="text-sm font-medium text-slate-200 group-hover:text-white">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
            </a>
          ))}
        </div>
      </div>

      {/* Security reminders */}
      <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-5">
        <h3 className="font-semibold text-amber-300 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Security Reminders</h3>
        <ul className="space-y-2 text-sm text-amber-400/80">
          {[
            "Never share your SUPABASE_SERVICE_ROLE_KEY — it bypasses all RLS policies",
            "Admin access should be granted to 1–2 people maximum",
            "All admin actions are logged in the audit trail",
            "Rotate your ENCRYPTION_KEY if you suspect it has been compromised (existing encrypted data will need re-encryption)",
            "Use Stripe's test mode keys during development — never live keys",
            "Set up Vercel environment variable restrictions (production only for sensitive keys)",
          ].map(reminder => (
            <li key={reminder} className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
              {reminder}
            </li>
          ))}
        </ul>
      </div>

      {/* Version info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="font-semibold text-white mb-3">System Info</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            ["Product", "Aria v1.0"],
            ["Stack", "Next.js 15 + Supabase + Stripe"],
            ["AI Engine", "OpenAI GPT-4o (+ Anthropic fallback)"],
            ["Database", "Supabase Postgres (RLS enabled)"],
            ["Hosting", "Vercel Edge Network"],
            ["Auth", "Supabase Auth (email sign-in, optional OAuth ready)"],
          ].map(([key, val]) => (
            <div key={key}>
              <p className="text-slate-500">{key}</p>
              <p className="text-slate-300 font-medium">{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

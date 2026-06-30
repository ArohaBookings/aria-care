"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";

const TITLES: Record<string, { title: string; sub: string }> = {
  "/dashboard": { title: "Dashboard", sub: "Overview of your organisation" },
  "/notes": { title: "Voice Notes", sub: "Record and manage progress notes" },
  "/participants": { title: "Participants", sub: "Manage your participants" },
  "/rostering": { title: "Rostering", sub: "Schedule and manage shifts" },
  "/compliance": { title: "Compliance", sub: "Staff certifications and tracking" },
  "/billing": { title: "Billing", sub: "NDIS claims and billing assistant" },
  "/staff": { title: "Staff", sub: "Team management" },
  "/settings": { title: "Settings", sub: "Account and organisation settings" },
};

const SOLO_TITLES: Record<string, { title: string; sub: string }> = {
  "/dashboard": { title: "Solo Dashboard", sub: "Your private note workspace" },
  "/notes": { title: "Create Note", sub: "Voice or bullet points to copy-ready drafts" },
  "/billing": { title: "Upgrade", sub: "Solo plan, usage and card-secured trials" },
  "/settings": { title: "Settings", sub: "Solo account and note preferences" },
};

export default function TopBar({ userName, orgName, productMode = "provider" }: { userName: string; orgName: string; productMode?: "provider" | "solo" }) {
  const pathname = usePathname();
  // Match by prefix for nested routes
  const key = Object.keys(TITLES).find(k => pathname === k || (k !== "/dashboard" && pathname.startsWith(k))) ?? "/dashboard";
  const info = productMode === "solo" ? SOLO_TITLES[key] ?? TITLES[key] : TITLES[key];
  const primaryAction = productMode === "solo"
    ? { href: "/notes", label: "Open note history" }
    : { href: "/participants", label: "Open participant directory" };

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 pl-16 md:px-6 md:pl-6 flex-shrink-0">
      <div className="min-w-0 pr-3">
        <h1 className="font-display text-lg font-bold text-slate-900 leading-none truncate">{info.title}</h1>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{info.sub}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="hidden lg:block text-right mr-2">
          <p className="text-sm font-semibold text-slate-900 truncate max-w-52">{userName || "Aria user"}</p>
          <p className="text-[11px] text-slate-400 truncate max-w-52">{productMode === "solo" ? "Aria Care Solo" : orgName || "Organisation"}</p>
        </div>
        <Link
          href={primaryAction.href}
          aria-label={primaryAction.label}
          title={primaryAction.label}
          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all"
        >
          <Search className="w-4 h-4" />
        </Link>
        <Link
          href="/settings?tab=notifications"
          aria-label="Open notification settings"
          title="Open notification settings"
          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all relative"
        >
          <Bell className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}

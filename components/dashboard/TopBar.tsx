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

export default function TopBar({ userName, orgName }: { userName: string; orgName: string }) {
  const pathname = usePathname();
  // Match by prefix for nested routes
  const key = Object.keys(TITLES).find(k => pathname === k || (k !== "/dashboard" && pathname.startsWith(k))) ?? "/dashboard";
  const info = TITLES[key];

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h1 className="font-display text-lg font-bold text-slate-900 leading-none">{info.title}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{info.sub}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden lg:block text-right mr-2">
          <p className="text-sm font-semibold text-slate-900 truncate max-w-52">{userName || "Aria user"}</p>
          <p className="text-[11px] text-slate-400 truncate max-w-52">{orgName || "Organisation"}</p>
        </div>
        <Link
          href="/participants"
          aria-label="Open participant directory"
          title="Open participant directory"
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

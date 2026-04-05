"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, FileText, Shield, DollarSign,
  Calendar, Settings, LogOut, Sparkles, ChevronRight,
  Mic, Menu, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import { useState } from "react";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/notes", icon: Mic, label: "Voice Notes", highlight: true },
  { href: "/documents", icon: FileText, label: "Documents" },
  { href: "/participants", icon: Users, label: "Participants" },
  { href: "/rostering", icon: Calendar, label: "Rostering" },
  { href: "/compliance", icon: Shield, label: "Compliance" },
  { href: "/billing", icon: DollarSign, label: "Billing" },
  { href: "/staff", icon: Users, label: "Staff" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

interface SidebarProps {
  userEmail: string;
  userName: string;
  userRole: string;
  orgName: string;
  subscriptionTier: string;
}

export default function Sidebar({ userEmail, userName, userRole, orgName, subscriptionTier }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const initials = getInitials(userName || userEmail);
  const isPro = ["growth", "business"].includes(subscriptionTier);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-100 flex-shrink-0">
        <div className="w-8 h-8 bg-aria-gradient rounded-xl flex items-center justify-center shadow-teal-sm">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-display text-lg font-bold text-slate-900 leading-none block">Aria</span>
          <span className="text-[10px] text-slate-400 leading-none">{orgName}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="section-title px-3 mb-3 pt-1">Menu</p>
        {NAV.map(({ href, icon: Icon, label, highlight }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-aria-50 text-aria-700 border border-aria-100"
                  : highlight
                  ? "text-slate-700 hover:bg-aria-50/50 border border-transparent hover:border-aria-100/50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-aria-600" : ""}`} />
              <span className="flex-1">{label}</span>
              {highlight && !active && (
                <ChevronRight className="w-3.5 h-3.5 text-aria-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              {active && <div className="w-1.5 h-1.5 rounded-full bg-aria-500" />}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade CTA */}
      {!isPro && (
        <div className="px-3 pb-3">
          <Link href="/settings?tab=billing" className="block bg-gradient-to-br from-aria-50 to-sky-50 border border-aria-100 rounded-xl p-4 hover:border-aria-200 transition-all">
            <p className="text-xs font-bold text-aria-700 mb-1">Upgrade to Growth</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">Unlock billing assistant, rostering & participant portal</p>
          </Link>
        </div>
      )}

      {/* User */}
      <div className="border-t border-slate-100 p-3 flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-aria-gradient flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{userName || userEmail}</p>
            <p className="text-[10px] text-slate-400 capitalize">{userRole.replace("_", " ")}</p>
          </div>
          <button onClick={handleLogout} title="Sign out" className="text-slate-400 hover:text-slate-700 transition-colors p-1">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex w-60 bg-white border-r border-slate-100 flex-col flex-shrink-0 h-full">
        <SidebarContent />
      </div>
      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-card"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-4 h-4 text-slate-700" /> : <Menu className="w-4 h-4 text-slate-700" />}
      </button>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-64 bg-white border-r border-slate-100 h-full shadow-xl"><SidebarContent /></div>
          <div className="flex-1 bg-black/20" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}

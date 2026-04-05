"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Building2, BarChart3, Settings, LogOut, ShieldAlert, ScrollText, Megaphone, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin", icon: LayoutDashboard, label: "Overview", exact: true },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/organisations", icon: Building2, label: "Organisations" },
  { href: "/admin/revenue", icon: BarChart3, label: "Revenue" },
  { href: "/admin/announcements", icon: Megaphone, label: "Announcements" },
  { href: "/admin/audit-log", icon: ScrollText, label: "Audit Log" },
  { href: "/admin/settings", icon: Settings, label: "Admin Settings" },
];

export default function AdminSidebar({ admin }: { admin: { email: string; name: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col h-full flex-shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-slate-800">
        <div className="w-7 h-7 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center">
          <ShieldAlert className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-white text-sm">Aria Admin</span>
          <div className="text-[10px] text-red-400 font-mono leading-none">SUPER ADMIN</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href) && href !== "/admin";
          const isExactAdmin = exact && pathname === "/admin";
          const isActive = active || isExactAdmin;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-red-500/15 text-red-400 border border-red-500/20"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Back to app */}
      <div className="px-2 pb-2">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all">
          <Zap className="w-4 h-4" /> Back to App
        </Link>
      </div>

      {/* User */}
      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-2 px-1">
          <div className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-xs font-bold text-red-400 flex-shrink-0">
            {admin.name?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-300 truncate">{admin.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{admin.email}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-600 hover:text-slate-300 transition-colors p-1">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

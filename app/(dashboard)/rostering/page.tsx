import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Calendar, Plus, AlertCircle, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { format, startOfWeek, addDays } from "date-fns";

export const metadata = { title: "Rostering | Aria" };

export default async function RosteringPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("users").select("organisation_id").eq("id", user!.id).single();
  const orgId = profile?.organisation_id;

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(addDays(weekStart, 6), "yyyy-MM-dd");

  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, shift_date, start_time, end_time, participants(full_name), users(full_name), notes, status")
    .eq("organisation_id", orgId)
    .gte("shift_date", weekStartStr)
    .lte("shift_date", weekEndStr)
    .order("shift_date")
    .order("start_time");

  const shiftsByDate = shifts?.reduce((acc, s) => {
    if (!acc[s.shift_date]) acc[s.shift_date] = [];
    acc[s.shift_date].push(s);
    return acc;
  }, {} as Record<string, typeof shifts>) ?? {};

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Rostering</h2>
          <p className="text-sm text-slate-500 mt-0.5">Week of {format(weekStart, "d MMMM yyyy")}</p>
        </div>
        <Link href="/rostering/new" className="btn-primary"><Plus className="w-4 h-4" /> Add shift</Link>
      </div>

      {/* Week grid */}
      <div className="card overflow-hidden mb-6">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {weekDates.map((date, i) => {
            const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
            return (
              <div key={i} className={`px-3 py-3 text-center border-r border-slate-50 last:border-0 ${isToday ? "bg-aria-50" : ""}`}>
                <p className={`text-xs font-bold ${isToday ? "text-aria-600" : "text-slate-500"}`}>{DAYS[i]}</p>
                <p className={`font-display text-lg font-bold ${isToday ? "text-aria-700" : "text-slate-900"}`}>{format(date, "d")}</p>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-7 min-h-[200px]">
          {weekDates.map((date, i) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const dayShifts = shiftsByDate[dateStr] ?? [];
            return (
              <div key={i} className="px-2 py-3 border-r border-slate-50 last:border-0 space-y-1.5">
                {dayShifts.map(shift => {
                  const p_data = shift.participants as unknown as { full_name: string } | null;
                  const u_data = shift.users as unknown as { full_name: string } | null;
                  return (
                    <div key={shift.id} className="bg-aria-50 border border-aria-100 rounded-lg p-2 text-xs">
                      <p className="font-semibold text-aria-800 truncate">{p_data?.full_name ?? "—"}</p>
                      <p className="text-aria-600 truncate">{u_data?.full_name ?? "Unassigned"}</p>
                      {shift.start_time && <p className="text-aria-500 mt-0.5">{shift.start_time.slice(0,5)}–{shift.end_time?.slice(0,5) ?? "?"}</p>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* All upcoming shifts list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-slate-900 text-sm">All shifts this week</h3>
          <span className="badge-teal ml-auto">{shifts?.length ?? 0} shifts</span>
        </div>
        {!shifts?.length ? (
          <div className="p-10 text-center">
            <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-3">No shifts scheduled this week</p>
            <Link href="/rostering/new" className="btn-primary inline-flex text-sm"><Plus className="w-4 h-4" /> Schedule a shift</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {shifts.map(shift => {
              const p_data = shift.participants as unknown as { full_name: string } | null;
              const u_data = shift.users as unknown as { full_name: string } | null;
              return (
                <div key={shift.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-aria-50 border border-aria-100 flex items-center justify-center text-xs font-bold text-aria-700">
                      {format(new Date(shift.shift_date), "dd")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{p_data?.full_name ?? "Unassigned participant"}</p>
                      <p className="text-xs text-slate-500">{u_data?.full_name ?? "No worker"} · {formatDate(shift.shift_date)} {shift.start_time && `· ${shift.start_time.slice(0,5)}`}</p>
                    </div>
                  </div>
                  <span className={shift.status === "completed" ? "badge-green" : shift.status === "cancelled" ? "badge-red" : "badge-slate"}>
                    {shift.status ?? "scheduled"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

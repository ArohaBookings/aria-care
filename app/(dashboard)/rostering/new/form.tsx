"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

type Participant = { id: string; full_name: string };
type Worker = { id: string; full_name: string | null; email: string; role: string };

export default function NewShiftForm({ participants, workers }: { participants: Participant[]; workers: Worker[] }) {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const [participantId, setParticipantId] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [date, setDate] = useState(today);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantId) return toast.error("Select a participant");
    if (!date || !start || !end) return toast.error("Fill in date and times");
    if (start >= end) return toast.error("End time must be after start time");

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Your session has expired", "Please sign in again.");
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase.from("users").select("organisation_id").eq("id", user.id).single();

    const { error } = await supabase.from("shifts").insert({
      organisation_id: profile!.organisation_id,
      participant_id: participantId,
      worker_id: workerId || null,
      shift_date: date,
      start_time: start,
      end_time: end,
      notes: notes || null,
      status: "scheduled",
    });

    setSaving(false);
    if (error) {
      toast.error("Could not create shift", error.message);
      return;
    }
    toast.success("Shift scheduled");
    router.push("/rostering");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="card p-6 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Participant <span className="text-red-500">*</span></label>
          <select value={participantId} onChange={(e) => setParticipantId(e.target.value)} className="input" required>
            <option value="">Select participant…</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Support worker</label>
          <select value={workerId} onChange={(e) => setWorkerId(e.target.value)} className="input">
            <option value="">Unassigned</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.full_name || w.email} {w.role === "support_worker" ? "" : `(${w.role})`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" min={today} required />
        </div>
        <div>
          <label className="label">Start</label>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="input" required />
        </div>
        <div>
          <label className="label">End</label>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="input" required />
        </div>
      </div>

      <div>
        <label className="label">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Activity plan, medication reminders, transport arrangements…"
          className="input resize-y"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary py-2.5 px-5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
          Schedule shift
        </button>
      </div>
    </form>
  );
}

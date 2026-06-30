// Pure aggregation helpers for the provider trend views.
// Input is a list of progress_notes rows (org-scoped by RLS upstream).
// These describe activity/themes recorded in notes — NOT clinical outcomes.

export interface NoteRow {
  id: string;
  participant_id: string | null;
  author_id: string | null;
  author_name: string | null;
  created_at: string;
  shift_date: string | null;
  note_text: string | null;
  mood: string | null;
  support_type: string | null;
  support_level: string | null;
  incident_flagged: boolean | null;
  suggested_review: boolean | null;
  suggested_review_reason: string | null;
  status: string | null;
  goals_referenced: string[] | null;
}

export interface SeriesPoint { label: string; value: number }

function monthKey(d: Date) {
  return d.toLocaleString("en-AU", { month: "short", year: "2-digit" });
}

function emptyMonths(count: number): Record<string, number> {
  const months: Record<string, number> = {};
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months[monthKey(d)] = 0;
  }
  return months;
}

function noteDate(n: NoteRow) {
  return new Date(n.shift_date ?? n.created_at);
}

export function monthlyCounts(notes: NoteRow[], predicate: (n: NoteRow) => boolean = () => true, count = 6): SeriesPoint[] {
  const months = emptyMonths(count);
  for (const n of notes) {
    if (!predicate(n)) continue;
    const key = monthKey(noteDate(n));
    if (key in months) months[key] += 1;
  }
  return Object.entries(months).map(([label, value]) => ({ label, value }));
}

function distribution(notes: NoteRow[], pick: (n: NoteRow) => string | null | undefined, limit = 8): SeriesPoint[] {
  const counts = new Map<string, number>();
  for (const n of notes) {
    const raw = pick(n);
    const key = (raw ?? "").toString().trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

export function moodThemes(notes: NoteRow[]) {
  return distribution(notes, (n) => n.mood);
}

export function supportCategories(notes: NoteRow[]) {
  return distribution(notes, (n) => n.support_type);
}

export function topGoals(notes: NoteRow[], limit = 8): SeriesPoint[] {
  const counts = new Map<string, number>();
  for (const n of notes) {
    for (const g of n.goals_referenced ?? []) {
      const key = (g ?? "").toString().trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

export function needsReview(n: NoteRow) {
  return n.status === "pending" || n.suggested_review === true;
}

export function hasFollowUp(n: NoteRow) {
  return n.suggested_review === true || !!(n.suggested_review_reason && n.suggested_review_reason.trim());
}

export function isConcern(n: NoteRow) {
  return n.incident_flagged === true || ["distressed", "variable"].includes((n.mood ?? "").toLowerCase());
}

export interface ParticipantSnapshot {
  participantId: string;
  totalNotes: number;
  lastNoteDate: string | null;
  latestSummary: string;
  recentConcerns: number;
  followUpNeeded: number;
  needsReview: number;
  weeklyTrend: number[];
}

export function participantSnapshot(participantId: string, notes: NoteRow[]): ParticipantSnapshot {
  const mine = notes
    .filter((n) => n.participant_id === participantId)
    .sort((a, b) => noteDate(b).getTime() - noteDate(a).getTime());

  const latest = mine[0];
  const weeks: number[] = new Array(8).fill(0);
  const now = Date.now();
  for (const n of mine) {
    const weeksAgo = Math.floor((now - noteDate(n).getTime()) / (7 * 86400000));
    if (weeksAgo >= 0 && weeksAgo < 8) weeks[7 - weeksAgo] += 1;
  }

  return {
    participantId,
    totalNotes: mine.length,
    lastNoteDate: latest ? (latest.shift_date ?? latest.created_at) : null,
    latestSummary: (latest?.note_text ?? "").slice(0, 240),
    recentConcerns: mine.filter(isConcern).length,
    followUpNeeded: mine.filter(hasFollowUp).length,
    needsReview: mine.filter(needsReview).length,
    weeklyTrend: weeks,
  };
}

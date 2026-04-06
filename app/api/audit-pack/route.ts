import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("organisation_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !["owner", "coordinator"].includes(profile.role ?? "")) {
      return NextResponse.json({ error: "Only owners and coordinators can generate audit packs" }, { status: 403 });
    }

    const { participantId } = await request.json();
    if (!participantId) return NextResponse.json({ error: "participantId required" }, { status: 400 });

    // Fetch everything for this participant
    const [
      { data: participant },
      { data: notes },
      { data: supportPlans },
      { data: incidents },
      { data: shifts },
    ] = await Promise.all([
      supabase.from("participants").select("*").eq("id", participantId).eq("organisation_id", profile.organisation_id).single(),
      supabase.from("progress_notes").select("*").eq("participant_id", participantId).eq("status", "approved").order("created_at", { ascending: false }),
      supabase.from("support_plans").select("*").eq("participant_id", participantId).order("created_at", { ascending: false }).limit(3),
      supabase.from("incident_reports").select("*").eq("participant_id", participantId).order("created_at", { ascending: false }),
      supabase.from("shifts").select("*").eq("participant_id", participantId).order("shift_date", { ascending: false }).limit(50),
    ]);

    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 });

    const auditPack = {
      generatedAt: new Date().toISOString(),
      participant: {
        name: participant.full_name,
        ndisNumber: participant.ndis_number,
        dateOfBirth: participant.date_of_birth,
        diagnoses: participant.diagnoses,
        planStartDate: participant.plan_start_date,
        planEndDate: participant.plan_end_date,
        status: participant.status,
      },
      summary: {
        totalApprovedNotes: notes?.length ?? 0,
        supportPlansOnFile: supportPlans?.length ?? 0,
        incidentReports: incidents?.length ?? 0,
        shiftsDelivered: shifts?.length ?? 0,
        dateRangeFrom: shifts?.[shifts.length - 1]?.shift_date ?? null,
        dateRangeTo: shifts?.[0]?.shift_date ?? null,
      },
      progressNotes: notes?.map(n => ({
        date: n.shift_date,
        noteText: n.note_text,
        supportLevel: n.support_level,
        mood: n.mood,
        authorName: n.author_name,
        approvedAt: n.approved_at,
        incidentFlagged: n.incident_flagged,
      })),
      currentSupportPlan: supportPlans?.[0]?.plan_data ?? null,
      incidentReports: incidents?.map(i => ({
        date: i.created_at,
        type: i.report_data?.incidentType,
        severity: i.severity,
        narrative: i.report_data?.narrative,
        isReportableToNDIS: i.is_reportable_to_ndis,
        status: i.status,
      })),
      shiftsDelivered: shifts?.map(s => ({
        date: s.shift_date,
        startTime: s.start_time,
        endTime: s.end_time,
        workerName: s.worker_name,
        status: s.status,
        supportType: s.support_type,
      })),
    };

    return NextResponse.json({ success: true, auditPack });
  } catch (error) {
    console.error("Audit pack error:", error);
    return NextResponse.json({ error: "Failed to generate audit pack" }, { status: 500 });
  }
}

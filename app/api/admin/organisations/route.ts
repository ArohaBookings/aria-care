import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase, requireAdmin, logAdminAction } from "@/lib/supabase/admin";

const PLAN_LIMITS: Record<string, number> = { trial: 10, starter: 10, growth: 30, business: 75 };

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await requireAdmin(user.id);

    const search = request.nextUrl.searchParams.get("search") ?? "";
    const sb = createAdminSupabase();

    let query = sb
      .from("organisations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (search) query = query.ilike("name", `%${search}%`);

    const { data: organisations, error } = await query;
    if (error) throw error;

    // Enrich with counts
    const enriched = await Promise.all((organisations ?? []).map(async (org) => {
      const [{ count: user_count }, { count: participant_count }] = await Promise.all([
        sb.from("users").select("*", { count: "exact", head: true }).eq("organisation_id", org.id),
        sb.from("participants").select("*", { count: "exact", head: true }).eq("organisation_id", org.id).eq("status", "active"),
      ]);
      return { ...org, user_count, participant_count };
    }));

    return NextResponse.json({ organisations: enriched });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    if (msg.includes("admin")) return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = await requireAdmin(user.id);

    const body = await request.json();
    const { action, orgId, plan, participantLimit } = body;
    const sb = createAdminSupabase();

    switch (action) {
      case "change_plan": {
        const limit = participantLimit ?? PLAN_LIMITS[plan] ?? 10;
        await sb.from("organisations").update({
          subscription_tier: plan,
          subscription_status: plan === "trial" ? "trialing" : "active",
          participant_limit: limit,
        }).eq("id", orgId);
        await logAdminAction(admin.id, admin.email, "change_plan", "organisation", orgId, { plan, limit });
        return NextResponse.json({ message: `Plan changed to ${plan}` });
      }

      case "extend_trial": {
        const newEnd = new Date();
        newEnd.setDate(newEnd.getDate() + 14);
        await sb.from("organisations").update({
          trial_ends_at: newEnd.toISOString(),
          subscription_status: "trialing",
        }).eq("id", orgId);
        await logAdminAction(admin.id, admin.email, "extend_trial", "organisation", orgId, { days: 14 });
        return NextResponse.json({ message: "Trial extended by 14 days" });
      }

      case "grant_free_month": {
        const newEnd = new Date();
        newEnd.setDate(newEnd.getDate() + 30);
        await sb.from("organisations").update({
          trial_ends_at: newEnd.toISOString(),
          subscription_status: "trialing",
        }).eq("id", orgId);
        await logAdminAction(admin.id, admin.email, "grant_free_month", "organisation", orgId, { days: 30 });
        return NextResponse.json({ message: "30 days of free access granted" });
      }

      case "reset_participants": {
        await sb.from("participants").update({ funding_remaining_pct: 100 }).eq("organisation_id", orgId);
        await logAdminAction(admin.id, admin.email, "reset_participants", "organisation", orgId, {});
        return NextResponse.json({ message: "Participant data reset" });
      }

      case "delete_org": {
        // Cascade deletes handled by FK constraints in schema
        const { error } = await sb.from("organisations").delete().eq("id", orgId);
        if (error) throw error;
        await logAdminAction(admin.id, admin.email, "delete_org", "organisation", orgId, {});
        return NextResponse.json({ message: "Organisation deleted" });
      }

      case "send_welcome": {
        // In production hook this to your email service (Resend, SendGrid etc)
        await logAdminAction(admin.id, admin.email, "send_welcome", "organisation", orgId, {});
        return NextResponse.json({ message: "Welcome email queued (configure email service to activate)" });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Action failed";
    if (msg.includes("admin")) return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

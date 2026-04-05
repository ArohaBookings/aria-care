import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase, requireAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await requireAdmin(user.id);

    const sb = createAdminSupabase();
    const { data: announcements } = await sb
      .from("system_announcements")
      .select("*")
      .order("created_at", { ascending: false });

    return NextResponse.json({ announcements });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const admin = await requireAdmin(user.id);

    const body = await request.json();
    const { action, id, title, message, type, expires_at, is_active } = body;
    const sb = createAdminSupabase();

    switch (action) {
      case "create": {
        const { error } = await sb.from("system_announcements").insert({
          title, message, type: type ?? "info",
          is_active: true,
          created_by: admin.id,
          expires_at: expires_at ? new Date(expires_at).toISOString() : null,
        });
        if (error) throw error;
        return NextResponse.json({ message: "Announcement published" });
      }
      case "toggle": {
        await sb.from("system_announcements").update({ is_active }).eq("id", id);
        return NextResponse.json({ message: "Updated" });
      }
      case "delete": {
        await sb.from("system_announcements").delete().eq("id", id);
        return NextResponse.json({ message: "Deleted" });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    if (msg.includes("admin")) return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      return NextResponse.json({ error: "Only coordinators and owners can approve notes" }, { status: 403 });
    }

    const { noteId, action, editedText } = await request.json();
    if (!noteId || !action) return NextResponse.json({ error: "noteId and action required" }, { status: 400 });

    const updates: Record<string, unknown> = {
      status: action === "approve" ? "approved" : "rejected",
      approved_by: action === "approve" ? user.id : null,
      approved_at: action === "approve" ? new Date().toISOString() : null,
    };

    if (editedText && action === "approve") updates.note_text = editedText;

    const { error } = await supabase
      .from("progress_notes")
      .update(updates)
      .eq("id", noteId)
      .eq("organisation_id", profile.organisation_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Approve note error:", error);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

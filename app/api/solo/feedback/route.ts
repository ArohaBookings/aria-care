import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RATINGS = new Set(["yes", "sort_of", "no"]);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const noteId = typeof body.noteId === "string" ? body.noteId : "";
    const rating = typeof body.rating === "string" ? body.rating : "";
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";

    if (!noteId || !RATINGS.has(rating)) {
      return NextResponse.json({ error: "Valid noteId and rating are required" }, { status: 400 });
    }

    const { data: note } = await supabase
      .from("solo_notes")
      .select("id")
      .eq("id", noteId)
      .eq("user_id", user.id)
      .single();

    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    const { error } = await supabase.from("solo_note_feedback").insert({
      note_id: noteId,
      user_id: user.id,
      rating,
      comment: comment || null,
    });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[solo/feedback] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save feedback" },
      { status: 500 }
    );
  }
}

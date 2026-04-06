import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireManager() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("organisation_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.organisation_id) {
    return { error: NextResponse.json({ error: "No organisation" }, { status: 400 }) };
  }

  if (!["owner", "coordinator"].includes(profile.role ?? "")) {
    return { error: NextResponse.json({ error: "Only owners and coordinators can manage participants" }, { status: 403 }) };
  }

  return { supabase, profile };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireManager();
  if ("error" in access) {
    return access.error;
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const { error } = await access.supabase
      .from("participants")
      .update(body)
      .eq("id", id)
      .eq("organisation_id", access.profile.organisation_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update participant error:", error);
    return NextResponse.json({ error: "Failed to update participant" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireManager();
  if ("error" in access) {
    return access.error;
  }

  try {
    const { id } = await params;

    const { error } = await access.supabase
      .from("participants")
      .delete()
      .eq("id", id)
      .eq("organisation_id", access.profile.organisation_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete participant error:", error);
    return NextResponse.json({ error: "Failed to delete participant" }, { status: 500 });
  }
}

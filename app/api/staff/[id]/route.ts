import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_ROLES = new Set(["owner", "coordinator", "support_worker"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("organisation_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.organisation_id) {
      return NextResponse.json({ error: "No organisation" }, { status: 400 });
    }

    if (!["owner", "coordinator"].includes(profile.role ?? "")) {
      return NextResponse.json({ error: "Only owners and coordinators can manage staff" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const role = typeof body.role === "string" ? body.role : null;
    const isActive = typeof body.is_active === "boolean" ? body.is_active : null;

    if (!role || isActive === null || !ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "Valid role and status are required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("users")
      .update({ role, is_active: isActive })
      .eq("id", id)
      .eq("organisation_id", profile.organisation_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update staff error:", error);
    return NextResponse.json({ error: "Failed to update staff member" }, { status: 500 });
  }
}

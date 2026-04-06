import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET  /api/compliance         → list all compliance items for the caller's org
// POST /api/compliance         → create a new compliance item for a staff member
//
// Both endpoints rely on Supabase RLS to enforce org isolation.

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("staff_compliance")
      .select("id, user_id, item_type, item_label, expiry_date, issued_date, document_url, status, updated_at, users(full_name, email)")
      .order("expiry_date", { ascending: true, nullsFirst: false });

    if (error) throw error;
    return NextResponse.json({ items: data ?? [] });
  } catch (err) {
    console.error("GET /api/compliance error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load compliance items" },
      { status: 500 }
    );
  }
}

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

    if (!profile?.organisation_id) {
      return NextResponse.json({ error: "No organisation" }, { status: 400 });
    }

    // Only owners and coordinators can add compliance records for other staff.
    if (!["owner", "coordinator"].includes(profile.role ?? "")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, item_type, item_label, expiry_date, issued_date, document_url } = body as {
      user_id?: string;
      item_type?: string;
      item_label?: string;
      expiry_date?: string | null;
      issued_date?: string | null;
      document_url?: string | null;
    };

    if (!user_id || !item_type || !item_label) {
      return NextResponse.json({ error: "user_id, item_type and item_label are required" }, { status: 400 });
    }

    // Compute initial status from expiry_date so the record is correct
    // even before the daily cron next runs.
    let status: "valid" | "expiring_soon" | "expired" = "valid";
    if (expiry_date) {
      const days = Math.ceil((new Date(expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (days < 0) status = "expired";
      else if (days <= 60) status = "expiring_soon";
    }

    const { data, error } = await supabase
      .from("staff_compliance")
      .insert({
        organisation_id: profile.organisation_id,
        user_id,
        item_type,
        item_label,
        expiry_date: expiry_date || null,
        issued_date: issued_date || null,
        document_url: document_url || null,
        status,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (err) {
    console.error("POST /api/compliance error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create compliance item" },
      { status: 500 }
    );
  }
}

import { createClient } from "@/lib/supabase/server";
import DocumentsBuilder from "./builder";

export const metadata = { title: "Documents | Aria" };

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("users").select("organisation_id").eq("id", user.id).single()
    : { data: null };

  const { data: participants } = profile?.organisation_id
    ? await supabase
        .from("participants")
        .select("id, full_name")
        .eq("organisation_id", profile.organisation_id)
        .eq("status", "active")
        .order("full_name")
    : { data: [] };

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-slate-900">Documents</h1>
        <p className="text-sm text-slate-500 mt-1">
          Generate NDIS-compliant documents in seconds — support plans, incident reports, handover notes and emails.
        </p>
      </div>
      <DocumentsBuilder participants={participants ?? []} />
    </div>
  );
}

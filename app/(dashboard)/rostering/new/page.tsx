import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import NewShiftForm from "./form";

export const metadata = { title: "New shift | Aria" };

export default async function NewShiftPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("organisation_id, role")
    .eq("id", user.id)
    .single();
  if (!profile?.organisation_id) redirect("/onboarding");

  const [{ data: participants }, { data: workers }] = await Promise.all([
    supabase
      .from("participants")
      .select("id, full_name")
      .eq("organisation_id", profile.organisation_id)
      .eq("status", "active")
      .order("full_name"),
    supabase
      .from("users")
      .select("id, full_name, email, role")
      .eq("organisation_id", profile.organisation_id)
      .eq("is_active", true)
      .order("full_name"),
  ]);

  return (
    <div className="p-6 max-w-3xl">
      <Link href="/rostering" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to rostering
      </Link>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-slate-900">Schedule a shift</h1>
        <p className="text-sm text-slate-500 mt-1">Assign a support worker to a participant.</p>
      </div>
      <NewShiftForm participants={participants ?? []} workers={workers ?? []} />
    </div>
  );
}

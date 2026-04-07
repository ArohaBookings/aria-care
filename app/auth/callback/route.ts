import { createClient } from "@/lib/supabase/server";
import { getPostLoginRedirect } from "@/lib/admin-emails";
import { NextResponse } from "next/server";

// Supabase OAuth / magic-link / email-confirm / password-recovery callback.
// We branch on the `type` parameter to:
//   - route recovery flows to /reset-password
//   - route brand new OAuth users (e.g. Google) to /onboarding so they
//     can set their organisation name (raw_user_meta_data has no org_name)
//   - otherwise honour the ?redirect= parameter or default to /dashboard

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // "recovery" | "signup" | "magiclink" | "invite" | null
  const redirectParam = searchParams.get("redirect");
  const passthroughParams = new URLSearchParams(searchParams);

  if (!code) {
    const redirectUrl = new URL("/auth/complete", origin);
    passthroughParams.forEach((value, key) => redirectUrl.searchParams.set(key, value));
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchange error:", error);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Password recovery: send user to the reset form
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  // Determine whether this user needs onboarding. A user needs onboarding
  // if their organisation still has the placeholder name "My Organisation"
  // (the default the DB trigger inserts) — this catches Google OAuth new
  // users whose raw_user_meta_data had no organisation_name.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const preferredDestination = getPostLoginRedirect(user.email, redirectParam);
    if (preferredDestination === "/admin") {
      return NextResponse.redirect(`${origin}${preferredDestination}`);
    }

    const { data: profile } = await supabase
      .from("users")
      .select("organisation_id, organisations(name)")
      .eq("id", user.id)
      .single();

    const orgRel = (profile as unknown as { organisations: { name: string | null } | { name: string | null }[] | null } | null)?.organisations;
    const orgName = Array.isArray(orgRel) ? orgRel[0]?.name : orgRel?.name;

    if (profile?.organisation_id && (orgName === "My Organisation" || !orgName)) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  return NextResponse.redirect(`${origin}${getPostLoginRedirect(user?.email, redirectParam)}`);
}

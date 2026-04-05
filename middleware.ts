import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths that require an active (non-expired) subscription. Users with an
// expired trial are bounced to /billing?expired=true.
const TRIAL_ENFORCED_PATHS = [
  "/dashboard",
  "/participants",
  "/staff",
  "/notes",
  "/compliance",
  "/rostering",
  "/documents",
];

// Always reachable — even with an expired trial or no sub — so users can recover.
// /billing/success is listed explicitly because a fresh checkout may complete
// before the Stripe webhook lands (and writes stripe_subscription_id).
const TRIAL_BYPASS_PATHS = [
  "/billing",
  "/billing/success",
  "/settings",
  "/onboarding",
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (c: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          c.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          c.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const isDashboard = [
    "/dashboard", "/participants", "/staff", "/notes",
    "/compliance", "/billing", "/rostering", "/settings",
    "/onboarding", "/documents",
  ].some((p) => path.startsWith(p));
  const isAdmin = path.startsWith("/admin");
  const isAuth = path === "/login" || path === "/signup";

  // ---- Auth gate ----
  if ((isDashboard || isAdmin) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  if (isAuth && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // ---- Trial expiry gate ----
  // Admin routes and non-dashboard paths are exempt. Billing/settings/onboarding
  // are bypass paths so users can upgrade or complete their profile.
  if (user && isDashboard && !isAdmin) {
    const enforce = TRIAL_ENFORCED_PATHS.some((p) => path.startsWith(p));
    const bypass = TRIAL_BYPASS_PATHS.some((p) => path.startsWith(p));
    if (enforce && !bypass) {
      // Resolve the user's org and check trial status. We read from the
      // users table (not a JWT claim) to guarantee freshness after upgrade.
      const { data: profile } = await supabase
        .from("users")
        .select("organisation_id")
        .eq("id", user.id)
        .single();

      if (profile?.organisation_id) {
        const { data: org } = await supabase
          .from("organisations")
          .select("subscription_tier, subscription_status, trial_ends_at, stripe_subscription_id, name")
          .eq("id", profile.organisation_id)
          .single();

        // Gate 1: user has finished onboarding (org has a real name) but
        // has never attached a Stripe subscription — force them through
        // checkout before granting workspace access. This is what enforces
        // "card required at signup".
        const hasRealOrgName = org?.name && org.name !== "My Organisation";
        const hasStripeSub = !!org?.stripe_subscription_id;
        if (hasRealOrgName && !hasStripeSub) {
          const url = request.nextUrl.clone();
          url.pathname = "/onboarding";
          return NextResponse.redirect(url);
        }

        // Gate 2: trial has fully expired on our side (legacy free tier)
        // AND the org has no Stripe subscription.
        const isTrial = org?.subscription_tier === "trial";
        const trialExpired =
          isTrial &&
          org?.trial_ends_at &&
          new Date(org.trial_ends_at) < new Date();

        if (trialExpired) {
          const url = request.nextUrl.clone();
          url.pathname = "/billing";
          url.searchParams.set("expired", "true");
          return NextResponse.redirect(url);
        }

        // Gate 3: Stripe subscription is in an unpayable state.
        if (org?.subscription_status === "incomplete_expired" || org?.subscription_status === "unpaid") {
          const url = request.nextUrl.clone();
          url.pathname = "/billing";
          url.searchParams.set("expired", "true");
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

import { NextResponse, type NextRequest } from "next/server";

/*
 * Aria Edge middleware — auth + trial gating.
 *
 * Runs on Vercel's Edge Runtime (default, no Node.js deps).
 * We do NOT import @supabase/ssr here: that package pulls in
 * @supabase/realtime-js → ws, which uses __dirname and crashes Edge Runtime.
 * Using direct fetch() to Supabase REST APIs keeps this 100% Edge-compatible.
 */

// ─── Config ────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function projectRef() {
  if (!SUPABASE_URL) return "unknown";
  try {
    return new URL(SUPABASE_URL).hostname.split(".")[0];
  } catch {
    return "unknown";
  }
}

// ─── Cookie helpers (matches @supabase/ssr chunked format) ─────────────────

function cookieName() {
  return `sb-${projectRef()}-auth-token`;
}

/** Read the Supabase session from (possibly chunked) cookies. */
function readSession(req: NextRequest): {
  access_token?: string;
  refresh_token?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
} | null {
  const name = cookieName();

  // Try single cookie first
  const single = req.cookies.get(name);
  if (single) {
    try {
      return JSON.parse(single.value);
    } catch {
      return null;
    }
  }

  // Try chunked cookies: sb-xxx-auth-token.0, .1, .2 …
  const parts: string[] = [];
  for (let i = 0; ; i++) {
    const c = req.cookies.get(`${name}.${i}`);
    if (!c) break;
    parts.push(c.value);
  }
  if (!parts.length) return null;
  try {
    return JSON.parse(parts.join(""));
  } catch {
    return null;
  }
}

const CHUNK = 3180;
const COOKIE_OPTS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
};

/** Write session to both request (for downstream route) and response (for browser). */
function writeSession(
  req: NextRequest,
  res: NextResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: Record<string, any>,
) {
  const name = cookieName();
  const json = JSON.stringify(session);

  // Clear stale cookies (single + up to 10 chunks)
  for (const target of [req.cookies, res.cookies] as const) {
    target.delete(name);
    for (let i = 0; i < 10; i++) target.delete(`${name}.${i}`);
  }

  if (json.length <= CHUNK) {
    req.cookies.set(name, json);
    res.cookies.set(name, json, COOKIE_OPTS);
  } else {
    const chunks = json.match(new RegExp(`.{1,${CHUNK}}`, "g")) ?? [];
    chunks.forEach((c, i) => {
      req.cookies.set(`${name}.${i}`, c);
      res.cookies.set(`${name}.${i}`, c, COOKIE_OPTS);
    });
  }
}

// ─── Supabase REST helpers ─────────────────────────────────────────────────

type User = { id: string; email?: string };

/** GET /auth/v1/user — validate the current access token. */
async function getUser(token: string): Promise<User | null> {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
    });
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

/** POST /auth/v1/token — exchange a refresh token for a fresh session. */
async function refreshAuth(refreshToken: string) {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
    );
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

/** PostgREST single-row query. Returns null on error or 404. */
async function queryRow<T>(
  table: string,
  qs: string,
  token: string,
): Promise<T | null> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: ANON_KEY,
        Accept: "application/vnd.pgrst.object+json",
      },
    });
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

// ─── Path lists ────────────────────────────────────────────────────────────

const TRIAL_ENFORCED = [
  "/dashboard",
  "/participants",
  "/staff",
  "/notes",
  "/compliance",
  "/rostering",
  "/documents",
];

const TRIAL_BYPASS = [
  "/billing",
  "/billing/success",
  "/settings",
  "/onboarding",
];

const DASHBOARD_ROOTS = [
  "/dashboard",
  "/participants",
  "/staff",
  "/notes",
  "/compliance",
  "/billing",
  "/rostering",
  "/settings",
  "/onboarding",
  "/documents",
];

// ─── Middleware ─────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  try {
    let response = NextResponse.next({ request });

    // ── Resolve user from Supabase auth cookie ──
    const session = readSession(request);
    let accessToken = session?.access_token as string | undefined;
    let user: User | null = null;

    if (accessToken) {
      user = await getUser(accessToken);
    }

    // Token may have expired — try refresh
    if (!user && session?.refresh_token) {
      const fresh = await refreshAuth(session.refresh_token as string);
      if (fresh?.access_token) {
        accessToken = fresh.access_token;
        user = fresh.user ?? (await getUser(fresh.access_token));
        // Propagate new tokens to request (downstream) + response (browser)
        writeSession(request, response, fresh);
        // Recreate response so downstream sees updated request cookies
        response = NextResponse.next({ request });
        writeSession(request, response, fresh);
      }
    }

    const path = request.nextUrl.pathname;

    const isDashboard = DASHBOARD_ROOTS.some((p) => path.startsWith(p));
    const isAdmin = path.startsWith("/admin");
    const isAuth = path === "/login" || path === "/signup";

    // ── Auth gate ──
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

    // ── Trial / subscription gate ──
    if (user && isDashboard && !isAdmin && accessToken) {
      const enforce = TRIAL_ENFORCED.some((p) => path.startsWith(p));
      const bypass = TRIAL_BYPASS.some((p) => path.startsWith(p));

      if (enforce && !bypass) {
        const profile = await queryRow<{ organisation_id: string }>(
          "users",
          `select=organisation_id&id=eq.${user.id}`,
          accessToken,
        );

        if (profile?.organisation_id) {
          const org = await queryRow<{
            subscription_tier: string;
            subscription_status: string;
            trial_ends_at: string;
            stripe_subscription_id: string;
            name: string;
          }>(
            "organisations",
            `select=subscription_tier,subscription_status,trial_ends_at,stripe_subscription_id,name&id=eq.${profile.organisation_id}`,
            accessToken,
          );

          // Gate 1: Org exists with a real name but no Stripe subscription →
          // force through checkout (card required at signup)
          const hasRealOrgName = org?.name && org.name !== "My Organisation";
          const hasStripeSub = !!org?.stripe_subscription_id;
          if (hasRealOrgName && !hasStripeSub) {
            const url = request.nextUrl.clone();
            url.pathname = "/onboarding";
            return NextResponse.redirect(url);
          }

          // Gate 2: Legacy trial fully expired
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

          // Gate 3: Stripe subscription unpayable
          if (
            org?.subscription_status === "incomplete_expired" ||
            org?.subscription_status === "unpaid"
          ) {
            const url = request.nextUrl.clone();
            url.pathname = "/billing";
            url.searchParams.set("expired", "true");
            return NextResponse.redirect(url);
          }
        }
      }
    }

    return response;
  } catch (err) {
    console.error("[middleware] fatal error:", err);
    // Fail open — let the request through so the site stays up
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

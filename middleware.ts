import { NextResponse, type NextRequest } from "next/server";

/*
 * Minimal Node.js runtime middleware — passthrough, no auth logic.
 *
 * Running on Node.js runtime (not Edge) to avoid [ReferenceError: __dirname]
 * caused by Next.js 15.5.x bundling node:buffer + node:async_hooks into
 * every Edge middleware bundle, which Vercel's V8 isolate cannot execute.
 *
 * Auth and subscription gating live in (dashboard)/layout.tsx and
 * (admin)/layout.tsx (server components — no middleware needed).
 */

export const runtime = "nodejs";

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

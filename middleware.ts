import { NextResponse, type NextRequest } from "next/server";

/*
 * Minimal Edge middleware — no auth logic, no external imports.
 *
 * Auth and subscription gating live in (dashboard)/layout.tsx and
 * (admin)/layout.tsx (server components, Node.js runtime — no Edge limits).
 *
 * This file exists purely because Vercel requires a middleware export to
 * correctly route requests to Next.js serverless functions. Without it,
 * the deployment returns 404 for all routes.
 */

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

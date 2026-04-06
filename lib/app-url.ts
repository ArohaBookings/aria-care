import type { NextRequest } from "next/server";

type RequestLike = NextRequest | Request;

export function getAppUrl(request?: RequestLike): string {
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto");

    if (forwardedHost) {
      return `${forwardedProto ?? "https"}://${forwardedHost}`;
    }

    const origin = new URL(request.url).origin;
    if (origin && origin !== "null") {
      return origin;
    }
  }

  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

// ============================================================
// Aria — security helpers
// In-memory rate limiting + prompt-injection sanitization for
// any user text that gets forwarded into an AI model.
//
// The rate limiter is a best-effort in-process counter. It is
// sufficient for the first 500 customers on a single Vercel
// region. Swap the store for Vercel KV / Upstash Redis once you
// scale past a few thousand concurrent users or run multi-region.
// ============================================================

type Bucket = { count: number; resetAt: number };

// Map is cleared automatically when the Lambda goes cold. That's
// fine — limits are defense in depth, not billing-critical.
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Rate limit a key to `max` requests per `windowMs` milliseconds.
 *
 * @param key        Unique identifier — use `${userId}:${route}` for per-user limits.
 * @param max        Max requests allowed in the window.
 * @param windowMs   Window size in milliseconds. Defaults to 1 hour.
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number = 60 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1, resetAt };
  }

  if (bucket.count >= max) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { allowed: true, remaining: max - bucket.count, resetAt: bucket.resetAt };
}

// ------------------------------------------------------------
// Prompt sanitization
// ------------------------------------------------------------

const MAX_USER_TEXT_LENGTH = 50_000;

// Patterns that indicate a prompt-injection attempt. We do NOT try to
// block every possible variation — we redact the obvious ones. The real
// defense is that user input is always passed as user role content and
// never concatenated into the system prompt verbatim.
const INJECTION_PATTERNS = [
  /ignore (?:all |the )?(?:previous|prior|above) (?:instructions|prompts|messages)/gi,
  /disregard (?:all |the )?(?:previous|prior|above) (?:instructions|prompts|messages)/gi,
  /forget (?:all |the |your )?(?:previous|prior|above)?\s*(?:instructions|prompts|messages)?/gi,
  /^\s*system:/gim,
  /\byou are now\b/gi,
  /\bnew (?:system )?(?:prompt|instructions?):/gi,
  /\bact as (?:if you are |a )?(?:different|another|new)/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
];

/**
 * Sanitize arbitrary user text before passing to an AI model.
 * - Truncates to 50,000 characters
 * - Strips known prompt injection patterns
 * - Normalizes whitespace
 * Returns both the sanitized text and whether any redaction happened
 * (useful for logging suspicious input).
 */
export function sanitizeUserInput(raw: string): {
  text: string;
  redacted: boolean;
} {
  if (!raw) return { text: "", redacted: false };

  let text = raw.slice(0, MAX_USER_TEXT_LENGTH);
  let redacted = false;

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      redacted = true;
      text = text.replace(pattern, "[redacted]");
    }
  }

  // Collapse long runs of control characters / null bytes
  text = text.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "");

  return { text: text.trim(), redacted };
}

/**
 * Build a stable rate-limit key for an authenticated route call.
 */
export function rlKey(userId: string, route: string): string {
  return `${route}:${userId}`;
}

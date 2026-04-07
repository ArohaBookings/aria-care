const FALLBACK_ADMIN_EMAILS = new Set(
  ["leoanthonybons@gmail.com"]
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

export function isFallbackAdminEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();
  return !!normalized && FALLBACK_ADMIN_EMAILS.has(normalized);
}

export function getSafeRedirect(candidate?: string | null) {
  if (!candidate || !candidate.startsWith("/")) return "/dashboard";
  return candidate;
}

export function getPostLoginRedirect(email?: string | null, requestedRedirect?: string | null) {
  const safeRedirect = getSafeRedirect(requestedRedirect);

  if (isFallbackAdminEmail(email) && (safeRedirect === "/dashboard" || safeRedirect === "/")) {
    return "/admin";
  }

  return safeRedirect;
}

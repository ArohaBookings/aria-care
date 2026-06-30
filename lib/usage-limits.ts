export type ProviderPlanKey = "trial" | "starter" | "growth" | "business";
export type SoloPlanKey = "solo_free" | "solo" | "solo_pro";
export type PlanKey = ProviderPlanKey | SoloPlanKey;
export type ProductMode = "provider" | "solo";

export const PROVIDER_PLAN_ORDER: ProviderPlanKey[] = ["trial", "starter", "growth", "business"];
export const SOLO_PLAN_ORDER: SoloPlanKey[] = ["solo_free", "solo", "solo_pro"];
export const PLAN_ORDER: PlanKey[] = [...PROVIDER_PLAN_ORDER, ...SOLO_PLAN_ORDER];

export const PARTICIPANT_LIMITS: Record<ProviderPlanKey, number> = {
  trial: 10,
  starter: 10,
  growth: 30,
  business: 75,
};

export const NOTE_GENERATION_LIMITS: Record<ProviderPlanKey, number> = {
  trial: 10,
  starter: 25,
  growth: 100,
  business: 350,
};

export const SOLO_MONTHLY_NOTE_LIMITS: Record<SoloPlanKey, number> = {
  solo_free: 3,
  solo: 125,
  solo_pro: 400,
};

export const PLAN_PRICES_AUD: Record<PlanKey, number> = {
  trial: 0,
  starter: 149,
  growth: 349,
  business: 699,
  solo_free: 0,
  solo: 19,
  solo_pro: 29,
};

export const PLAN_PRICES_NZD: Record<PlanKey, number> = {
  trial: 0,
  starter: 149,
  growth: 349,
  business: 699,
  solo_free: 0,
  solo: 21,
  solo_pro: 32,
};

export const PLAN_LABELS: Record<PlanKey, string> = {
  trial: "Provider Trial",
  starter: "Provider Starter",
  growth: "Provider Growth",
  business: "Provider Business",
  solo_free: "Aria Care Solo Free",
  solo: "Aria Care Solo",
  solo_pro: "Aria Care Solo Pro",
};

export function isSoloPlan(plan?: string | null): plan is SoloPlanKey {
  return SOLO_PLAN_ORDER.includes(plan as SoloPlanKey);
}

export function isProviderPlan(plan?: string | null): plan is ProviderPlanKey {
  return PROVIDER_PLAN_ORDER.includes(plan as ProviderPlanKey);
}

export function normalizePlan(plan?: string | null): PlanKey {
  return PLAN_ORDER.includes(plan as PlanKey) ? (plan as PlanKey) : "trial";
}

export function normalizeProviderPlan(plan?: string | null): ProviderPlanKey {
  return PROVIDER_PLAN_ORDER.includes(plan as ProviderPlanKey) ? (plan as ProviderPlanKey) : "trial";
}

export function normalizeSoloPlan(plan?: string | null): SoloPlanKey {
  return SOLO_PLAN_ORDER.includes(plan as SoloPlanKey) ? (plan as SoloPlanKey) : "solo_free";
}

export function productModeForPlan(plan?: string | null): ProductMode {
  return isSoloPlan(plan) ? "solo" : "provider";
}

export function nextPaidPlan(plan?: string | null): Exclude<ProviderPlanKey, "trial"> | null {
  const normalized = normalizeProviderPlan(plan);
  if (normalized === "business") return null;
  if (normalized === "growth") return "business";
  return "growth";
}

export function nextSoloPaidPlan(plan?: string | null): Exclude<SoloPlanKey, "solo_free"> | null {
  const normalized = normalizeSoloPlan(plan);
  if (normalized === "solo_pro") return null;
  if (normalized === "solo") return "solo_pro";
  return "solo";
}

export function noteLimitForPlan(plan?: string | null) {
  return NOTE_GENERATION_LIMITS[normalizeProviderPlan(plan)];
}

export function soloMonthlyNoteLimit(plan?: string | null, override?: number | null) {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return override;
  }

  return SOLO_MONTHLY_NOTE_LIMITS[normalizeSoloPlan(plan)];
}

export function isPaidSoloPlan(plan?: string | null) {
  return normalizeSoloPlan(plan) !== "solo_free";
}

// ── Free Solo onboarding trial ──────────────────────────────────────────────
// New Free Solo users get unlimited notes (no card) for their first N days, then
// drop to the standard Free monthly limit. Bump SOLO_TRIAL_DAYS to 30 to beat
// Clio Care's 30-day free run.
export const SOLO_TRIAL_DAYS = 14;
export const SOLO_TRIAL_NOTE_LIMIT = 500; // effectively unlimited for a 14-day trial; caps runaway AI cost

export function soloTrialDaysLeft(orgCreatedAt?: string | null): number {
  if (!orgCreatedAt) return 0;
  const created = new Date(orgCreatedAt).getTime();
  if (Number.isNaN(created)) return 0;
  const elapsedDays = (Date.now() - created) / 86400000;
  return Math.max(0, Math.ceil(SOLO_TRIAL_DAYS - elapsedDays));
}

// Trial applies only to Free Solo within the window. Paid solo plans don't need it.
export function isSoloTrialActive(plan?: string | null, orgCreatedAt?: string | null): boolean {
  return normalizeSoloPlan(plan) === "solo_free" && soloTrialDaysLeft(orgCreatedAt) > 0;
}

export function effectiveSoloLimit(plan?: string | null, orgCreatedAt?: string | null, override?: number | null): number {
  if (isSoloTrialActive(plan, orgCreatedAt)) return SOLO_TRIAL_NOTE_LIMIT;
  return soloMonthlyNoteLimit(plan, override);
}

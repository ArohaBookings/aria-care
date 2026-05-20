export type PlanKey = "trial" | "starter" | "growth" | "business";

export const PLAN_ORDER: PlanKey[] = ["trial", "starter", "growth", "business"];

export const PARTICIPANT_LIMITS: Record<PlanKey, number> = {
  trial: 10,
  starter: 10,
  growth: 30,
  business: 75,
};

export const NOTE_GENERATION_LIMITS: Record<PlanKey, number> = {
  trial: 10,
  starter: 25,
  growth: 100,
  business: 350,
};

export function normalizePlan(plan?: string | null): PlanKey {
  return PLAN_ORDER.includes(plan as PlanKey) ? (plan as PlanKey) : "trial";
}

export function nextPaidPlan(plan?: string | null): Exclude<PlanKey, "trial"> | null {
  const normalized = normalizePlan(plan);
  if (normalized === "business") return null;
  if (normalized === "growth") return "business";
  return "growth";
}

export function noteLimitForPlan(plan?: string | null) {
  return NOTE_GENERATION_LIMITS[normalizePlan(plan)];
}

import type { VaultNutrientType, VaultNutrientScoring } from "./types";

export type DecayInput = {
  nutrientType: VaultNutrientType;
  createdAt: string; // ISO-8601
  lastSeenAt?: string | null; // ISO-8601; if present, resets the decay clock
  recurrenceCount?: number;
  severity: VaultNutrientScoring["severity"];
  isRecovered?: boolean;
  decayProfile: VaultNutrientScoring["decayProfile"];
};

/**
 * Half-life in days for each decay profile.
 * After one half-life, freshness drops to 0.5; after two, to 0.25; etc.
 */
const HALF_LIFE_DAYS: Record<VaultNutrientScoring["decayProfile"], number> = {
  fast: 2,      // Timeline pressure, delivery drift: stale within days
  medium: 7,    // Ambiguity, decision, risk: relevant for about a week
  slow: 21,     // Blockers, dependencies, stakeholders: linger until resolved
  persistent: 90, // Financial/governance: remain relevant until explicitly closed
};

/**
 * Compute how fresh a nutrient currently is, accounting for:
 * - age since creation (or last_seen_at, which resets the clock)
 * - recurrence reinforcement (each recurrence boosts freshness slightly)
 * - recovery status (recovered nutrients decay 3x faster)
 */
export function computeDecayedFreshness(input: DecayInput): number {
  const now = Date.now();
  const referenceMs = input.lastSeenAt
    ? Date.parse(input.lastSeenAt)
    : Date.parse(input.createdAt);

  const ageDays = Math.max(0, (now - referenceMs) / 86_400_000);
  const halfLifeDays = HALF_LIFE_DAYS[input.decayProfile];

  // Exponential decay: freshness = 0.5^(age / half_life)
  let freshness = Math.pow(0.5, ageDays / halfLifeDays);

  // Each confirmed recurrence boosts freshness by 5% (capped at +30%)
  const recurrenceBoost = Math.min(0.3, (input.recurrenceCount ?? 0) * 0.05);
  freshness = Math.min(1, freshness + recurrenceBoost);

  // Recovered nutrients decay 3x faster
  if (input.isRecovered) freshness *= 0.33;

  return Math.round(Math.max(0, Math.min(1, freshness)) * 100) / 100;
}

/**
 * Compute a 0–100 relevance score combining freshness and severity weight.
 * Used by future recall/surface layers to rank nutrients.
 */
export function computeCurrentRelevance(input: DecayInput): number {
  const freshness = computeDecayedFreshness(input);
  const severityWeight =
    input.severity === "critical" ? 1.0 :
    input.severity === "high" ? 0.85 :
    input.severity === "medium" ? 0.65 :
    0.4;

  return Math.round(freshness * severityWeight * 100);
}

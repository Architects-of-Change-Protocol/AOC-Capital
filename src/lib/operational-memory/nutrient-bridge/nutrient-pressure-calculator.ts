import type { VaultNutrient, VaultNutrientType } from "@/lib/vault/digestive/types";
import type { OperationalMemoryWeights } from "../runtime-memory-types";
import type { NutrientSignalClassification } from "./nutrient-bridge-types";

// ─── Base pressure per nutrient type ─────────────────────────────────────────

const BASE_PRESSURE: Record<VaultNutrientType, number> = {
  blocker_signal: 0.9,
  escalation_signal: 0.88,
  financial_impediment_signal: 0.85,
  timeline_pressure_signal: 0.8,
  delivery_drift_signal: 0.75,
  governance_gap_signal: 0.7,
  risk_signal: 0.65,
  dependency_signal: 0.6,
  contradiction_signal: 0.55,
  decision_signal: 0.5,
  commitment_signal: 0.5,
  stakeholder_signal: 0.45,
  ambiguity_signal: 0.3,
  recovery_signal: 0.05,
};

// ─── Pressure calculation ─────────────────────────────────────────────────────

/**
 * Returns a 0..1 pressure contribution score for a nutrient.
 *
 * Pressure increases with:
 *   - confirmed recurrence (same issue seen again)
 *   - higher severity
 *   - actionable signals
 *
 * Pressure decreases with:
 *   - informational-only signals
 *   - decayed freshness
 *   - high ambiguity
 *   - recovery signals (resolution is a good sign)
 */
export function calculateNutrientPressureContribution(
  nutrient: VaultNutrient,
  classification: NutrientSignalClassification,
): number {
  // Recovery signals actively reduce operational pressure
  if (nutrient.nutrientType === "recovery_signal") {
    return 0.05;
  }

  let pressure = BASE_PRESSURE[nutrient.nutrientType] ?? 0.5;
  const { scoring } = nutrient;

  // Recurrence multiplies pressure — same unresolved signal seen again = worse
  if (scoring.recurrenceHint === "confirmed_recurrence") {
    pressure = Math.min(1.0, pressure + 0.15);
  } else if (scoring.recurrenceHint === "possible_recurrence") {
    pressure = Math.min(1.0, pressure + 0.07);
  }

  // Severity scaling
  const severityScale: Record<string, number> = {
    critical: 1.0,
    high: 0.88,
    medium: 0.72,
    low: 0.48,
  };
  pressure *= severityScale[scoring.severity] ?? 0.72;

  // Actionability modifier
  if (scoring.actionability === "actionable") {
    pressure = Math.min(1.0, pressure * 1.1);
  } else if (scoring.actionability === "informational") {
    pressure *= 0.45;
  }

  // Decayed freshness reduces urgency
  if (scoring.freshness < 0.3) {
    pressure *= 0.7;
  } else if (scoring.freshness < 0.5) {
    pressure *= 0.88;
  }

  // Ambiguity reduces confidence in the signal's pressure
  if (scoring.ambiguityLevel === "highly_ambiguous") {
    pressure *= 0.6;
  } else if (scoring.ambiguityLevel === "ambiguous") {
    pressure *= 0.8;
  }

  return Math.max(0, Math.min(1.0, pressure));
}

// ─── Weight derivation ────────────────────────────────────────────────────────

/**
 * Derives OperationalMemoryWeights from a nutrient's characteristics.
 * These weights drive retrieval scoring and pressure accumulation in the
 * operational memory system.
 */
export function deriveOperationalWeightsFromNutrient(
  nutrient: VaultNutrient,
  classification: NutrientSignalClassification,
): OperationalMemoryWeights {
  const pressure = calculateNutrientPressureContribution(nutrient, classification);
  const { scoring } = nutrient;

  const sevWeight: Record<string, number> = {
    critical: 1.0,
    high: 0.85,
    medium: 0.65,
    low: 0.4,
  };
  const sev = sevWeight[scoring.severity] ?? 0.65;

  const recurrenceBoost =
    scoring.recurrenceHint === "confirmed_recurrence"
      ? 0.15
      : scoring.recurrenceHint === "possible_recurrence"
        ? 0.07
        : 0;

  const unresolvedWeight = classification.unresolved
    ? Math.min(1.0, sev + recurrenceBoost)
    : 0.15;

  const deliveryImpactWeight: Record<string, number> = {
    high: 0.9,
    medium: 0.65,
    low: 0.35,
    none: 0.1,
  };

  const isEscalation = classification.signalCategory === "escalation";

  return {
    continuityWeight: Math.min(1.0, sev + (classification.unresolved ? 0.1 : 0)),
    operationalPressureWeight: pressure,
    escalationWeight: isEscalation ? sev : Math.min(0.7, sev * 0.55),
    unresolvedWeight,
    deliveryImpactWeight: deliveryImpactWeight[classification.deliveryImpact] ?? 0.5,
  };
}

import type { VaultNutrientType, VaultNutrientScoring } from "./types";

export type ScoringInputs = {
  nutrientType: VaultNutrientType;
  confidence: number;
  /** Deterministic significance score 0..1. Defaults to confidence if not provided. */
  significanceScore?: number;
  isResolved?: boolean;
  isRecurring?: boolean;
};

const DECAY_PROFILES: Record<VaultNutrientType, VaultNutrientScoring["decayProfile"]> = {
  timeline_pressure_signal: "fast",
  delivery_drift_signal: "fast",
  recovery_signal: "fast",
  ambiguity_signal: "medium",
  contradiction_signal: "medium",
  commitment_signal: "medium",
  decision_signal: "medium",
  risk_signal: "medium",
  dependency_signal: "slow",
  blocker_signal: "slow",
  stakeholder_signal: "slow",
  escalation_signal: "slow",
  financial_impediment_signal: "persistent",
  governance_gap_signal: "persistent",
};

const SEVERITY_DEFAULTS: Record<VaultNutrientType, VaultNutrientScoring["severity"]> = {
  blocker_signal: "high",
  escalation_signal: "high",
  governance_gap_signal: "high",
  financial_impediment_signal: "high",
  risk_signal: "medium",
  delivery_drift_signal: "medium",
  timeline_pressure_signal: "medium",
  dependency_signal: "medium",
  stakeholder_signal: "medium",
  commitment_signal: "medium",
  contradiction_signal: "medium",
  decision_signal: "low",
  ambiguity_signal: "low",
  recovery_signal: "low",
};

export function scoreNutrient(inputs: ScoringInputs): VaultNutrientScoring {
  const baseSeverity = SEVERITY_DEFAULTS[inputs.nutrientType];
  const severity: VaultNutrientScoring["severity"] = inputs.isResolved ? "low" : baseSeverity;
  const decayProfile = inputs.isResolved ? "fast" : DECAY_PROFILES[inputs.nutrientType];

  const evidenceStrength: VaultNutrientScoring["evidenceStrength"] =
    inputs.confidence >= 0.8 ? "strong" :
    inputs.confidence >= 0.6 ? "moderate" :
    "weak";

  const actionability: VaultNutrientScoring["actionability"] =
    severity === "critical" || severity === "high" ? "actionable" :
    severity === "medium" ? "monitor" :
    "informational";

  const ambiguityLevel: VaultNutrientScoring["ambiguityLevel"] =
    inputs.confidence < 0.5 ? "highly_ambiguous" :
    inputs.confidence < 0.7 ? "ambiguous" :
    "clear";

  const recurrenceHint: VaultNutrientScoring["recurrenceHint"] =
    inputs.isRecurring ? "confirmed_recurrence" : "first_occurrence";

  return {
    confidence: inputs.confidence,
    severity,
    freshness: 1.0, // Always 1.0 at creation; use decay utilities to compute decay over time
    recurrenceHint,
    ambiguityLevel,
    actionability,
    evidenceStrength,
    decayProfile,
    significanceScore: inputs.significanceScore ?? inputs.confidence,
  };
}

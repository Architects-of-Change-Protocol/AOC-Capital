import type { VaultNutrient, VaultNutrientType } from "@/lib/vault/digestive/types";
import type { OperationalMemoryRecordType } from "../runtime-memory-types";
import type { NutrientSignalCategory, NutrientSignalClassification } from "./nutrient-bridge-types";

// ─── Mapping table ────────────────────────────────────────────────────────────

type NutrientTypeEntry = {
  signalCategory: NutrientSignalCategory;
  suggestedMemoryType: OperationalMemoryRecordType;
  defaultSeverity: "low" | "medium" | "high" | "critical";
  defaultUnresolved: boolean;
  basePressureImpact: "none" | "low" | "medium" | "high";
  baseDeliveryImpact: "none" | "low" | "medium" | "high";
};

const NUTRIENT_TYPE_MAP: Record<VaultNutrientType, NutrientTypeEntry> = {
  blocker_signal: {
    signalCategory: "blocker",
    suggestedMemoryType: "blocker",
    defaultSeverity: "high",
    defaultUnresolved: true,
    basePressureImpact: "high",
    baseDeliveryImpact: "high",
  },
  risk_signal: {
    signalCategory: "risk",
    suggestedMemoryType: "risk",
    defaultSeverity: "medium",
    defaultUnresolved: true,
    basePressureImpact: "medium",
    baseDeliveryImpact: "medium",
  },
  dependency_signal: {
    signalCategory: "dependency",
    suggestedMemoryType: "dependency",
    defaultSeverity: "medium",
    defaultUnresolved: true,
    basePressureImpact: "medium",
    baseDeliveryImpact: "medium",
  },
  decision_signal: {
    signalCategory: "unresolved_decision",
    suggestedMemoryType: "decision",
    defaultSeverity: "medium",
    defaultUnresolved: true,
    basePressureImpact: "low",
    baseDeliveryImpact: "medium",
  },
  commitment_signal: {
    signalCategory: "commitment",
    suggestedMemoryType: "commitment",
    defaultSeverity: "medium",
    defaultUnresolved: true,
    basePressureImpact: "low",
    baseDeliveryImpact: "low",
  },
  delivery_drift_signal: {
    signalCategory: "delivery_pressure",
    suggestedMemoryType: "delivery_pressure",
    defaultSeverity: "high",
    defaultUnresolved: true,
    basePressureImpact: "high",
    baseDeliveryImpact: "high",
  },
  financial_impediment_signal: {
    signalCategory: "procurement_pressure",
    suggestedMemoryType: "delivery_pressure",
    defaultSeverity: "high",
    defaultUnresolved: true,
    basePressureImpact: "high",
    baseDeliveryImpact: "high",
  },
  governance_gap_signal: {
    signalCategory: "governance_gap",
    suggestedMemoryType: "governance_gap",
    defaultSeverity: "medium",
    defaultUnresolved: true,
    basePressureImpact: "medium",
    baseDeliveryImpact: "low",
  },
  escalation_signal: {
    signalCategory: "escalation",
    suggestedMemoryType: "escalation",
    defaultSeverity: "high",
    defaultUnresolved: true,
    basePressureImpact: "high",
    baseDeliveryImpact: "high",
  },
  recovery_signal: {
    signalCategory: "weak_signal",
    suggestedMemoryType: "recovery",
    defaultSeverity: "low",
    defaultUnresolved: false,
    basePressureImpact: "none",
    baseDeliveryImpact: "none",
  },
  ambiguity_signal: {
    signalCategory: "weak_signal",
    suggestedMemoryType: "risk",
    defaultSeverity: "low",
    defaultUnresolved: false,
    basePressureImpact: "low",
    baseDeliveryImpact: "low",
  },
  contradiction_signal: {
    signalCategory: "risk",
    suggestedMemoryType: "risk",
    defaultSeverity: "medium",
    defaultUnresolved: true,
    basePressureImpact: "low",
    baseDeliveryImpact: "medium",
  },
  timeline_pressure_signal: {
    signalCategory: "timeline_pressure",
    suggestedMemoryType: "timeline_signal",
    defaultSeverity: "high",
    defaultUnresolved: true,
    basePressureImpact: "high",
    baseDeliveryImpact: "high",
  },
  stakeholder_signal: {
    signalCategory: "stakeholder_alignment",
    suggestedMemoryType: "stakeholder_signal",
    defaultSeverity: "medium",
    defaultUnresolved: false,
    basePressureImpact: "medium",
    baseDeliveryImpact: "medium",
  },
};

const IMPACT_LEVELS = ["none", "low", "medium", "high"] as const;
type ImpactLevel = (typeof IMPACT_LEVELS)[number];

function shiftImpact(base: ImpactLevel, severity: string): ImpactLevel {
  const idx = IMPACT_LEVELS.indexOf(base);
  if (severity === "critical") return IMPACT_LEVELS[Math.min(idx + 1, 3)];
  if (severity === "low") return IMPACT_LEVELS[Math.max(idx - 1, 0)];
  return base;
}

export function classifyNutrientOperationalSignal(
  nutrient: VaultNutrient,
): NutrientSignalClassification {
  const entry = NUTRIENT_TYPE_MAP[nutrient.nutrientType];
  const { scoring } = nutrient;

  // Confidence is downgraded by ambiguity — record this transparently
  let confidence = scoring.confidence;
  if (scoring.ambiguityLevel === "highly_ambiguous") {
    confidence = Math.max(0, confidence * 0.7);
  } else if (scoring.ambiguityLevel === "ambiguous") {
    confidence = Math.max(0, confidence * 0.85);
  }

  const unresolved = entry.defaultUnresolved && scoring.actionability !== "informational";
  const pressureImpact = shiftImpact(entry.basePressureImpact, scoring.severity);
  const deliveryImpact = shiftImpact(entry.baseDeliveryImpact, scoring.severity);

  return {
    signalCategory: entry.signalCategory,
    operationalSeverity: scoring.severity,
    confidence,
    unresolved,
    pressureImpact,
    deliveryImpact,
    suggestedMemoryType: entry.suggestedMemoryType,
  };
}

export { NUTRIENT_TYPE_MAP };

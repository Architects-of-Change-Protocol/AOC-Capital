import type { VaultNutrient, VaultNutrientType } from "@/lib/vault/digestive/types";
import type {
  NutrientBridgeDiagnostic,
  NutrientBridgeDiagnosticReason,
  NutrientRecurrenceOutcome,
  NutrientRecurrenceResult,
  NutrientSignalClassification,
  NutrientSkipReason,
} from "./nutrient-bridge-types";

// ─── Explanation builders ─────────────────────────────────────────────────────

export function explainPromotionReason(
  nutrient: VaultNutrient,
  classification: NutrientSignalClassification,
  recurrence: NutrientRecurrenceResult,
): string {
  const parts: string[] = [
    `${nutrient.nutrientType} promoted to ${classification.suggestedMemoryType}`,
    `severity=${classification.operationalSeverity}`,
    `confidence=${classification.confidence.toFixed(2)}`,
    `significance=${nutrient.scoring.significanceScore.toFixed(2)}`,
  ];

  if (recurrence.outcome === "recurrence") {
    parts.push(`recurrence of record ${recurrence.matchingRecordId} (count: ${recurrence.recurrenceCount})`);
  } else if (recurrence.outcome === "escalation") {
    parts.push(`escalates record ${recurrence.matchingRecordId}`);
  } else if (recurrence.outcome === "resolved_followup") {
    parts.push(`resolves record ${recurrence.matchingRecordId}`);
  } else {
    parts.push("new signal, no prior match");
  }

  if (classification.pressureImpact !== "none") {
    parts.push(`pressure_impact=${classification.pressureImpact}`);
  }

  if (nutrient.scoring.recurrenceHint !== "first_occurrence") {
    parts.push(`nutrient_recurrence_hint=${nutrient.scoring.recurrenceHint}`);
  }

  return parts.join("; ");
}

export function explainSkipReason(nutrient: VaultNutrient, reason: NutrientSkipReason): string {
  switch (reason) {
    case "low_confidence":
      return `skipped: confidence ${nutrient.scoring.confidence.toFixed(2)} below minimum; ambiguity=${nutrient.scoring.ambiguityLevel}`;
    case "informational_only":
      return `skipped: actionability=informational with significance=${nutrient.scoring.significanceScore.toFixed(2)} — no operational action required`;
    case "duplicate_recent":
      return `skipped: nutrient ${nutrient.id} already processed in current bridge run`;
    case "already_linked":
      return `skipped: nutrient ${nutrient.id} already has an operational memory link`;
    case "out_of_scope":
      return `skipped: workspace/project scope mismatch`;
    case "below_significance_threshold":
      return `skipped: significance=${nutrient.scoring.significanceScore.toFixed(2)} below policy threshold`;
    case "ambiguity_signal_suppressed":
      return `skipped: ambiguity_signal on first_occurrence suppressed by policy (no recurrence evidence)`;
  }
}

function deriveReasonFromSkip(skipReason: NutrientSkipReason): NutrientBridgeDiagnosticReason {
  switch (skipReason) {
    case "low_confidence":
      return "skipped_low_confidence";
    case "informational_only":
      return "skipped_informational";
    case "duplicate_recent":
    case "already_linked":
      return "skipped_duplicate";
    case "below_significance_threshold":
    case "out_of_scope":
      return "skipped_below_threshold";
    case "ambiguity_signal_suppressed":
      return "suppressed_ambiguity";
  }
}

// ─── Diagnostic builders ──────────────────────────────────────────────────────

export function buildPromotionDiagnostic(
  nutrient: VaultNutrient,
  classification: NutrientSignalClassification,
  recurrence: NutrientRecurrenceResult,
  pressureDelta: number,
): NutrientBridgeDiagnostic {
  const isRecurrence = recurrence.outcome === "recurrence" || recurrence.outcome === "escalation";
  const reason: NutrientBridgeDiagnosticReason = isRecurrence
    ? "classified_as_recurrence"
    : "promoted_to_memory";

  return {
    nutrientId: nutrient.id,
    nutrientType: nutrient.nutrientType,
    reason,
    explanation: explainPromotionReason(nutrient, classification, recurrence),
    classification,
    recurrenceOutcome: recurrence.outcome,
    pressureDelta,
    timestamp: new Date().toISOString(),
  };
}

export function buildSkipDiagnostic(
  nutrient: VaultNutrient,
  skipReason: NutrientSkipReason,
): NutrientBridgeDiagnostic {
  return {
    nutrientId: nutrient.id,
    nutrientType: nutrient.nutrientType,
    reason: deriveReasonFromSkip(skipReason),
    explanation: explainSkipReason(nutrient, skipReason),
    classification: null,
    recurrenceOutcome: null,
    pressureDelta: 0,
    timestamp: new Date().toISOString(),
  };
}

export function buildConfidenceDowngradeDiagnostic(
  nutrient: VaultNutrient,
  originalConfidence: number,
  adjustedConfidence: number,
): NutrientBridgeDiagnostic {
  return {
    nutrientId: nutrient.id,
    nutrientType: nutrient.nutrientType,
    reason: "confidence_downgraded",
    explanation: `confidence downgraded from ${originalConfidence.toFixed(2)} to ${adjustedConfidence.toFixed(2)} due to ambiguity_level=${nutrient.scoring.ambiguityLevel}`,
    classification: null,
    recurrenceOutcome: null,
    pressureDelta: 0,
    timestamp: new Date().toISOString(),
  };
}

// ─── Summary report ───────────────────────────────────────────────────────────

export type NutrientBridgeDiagnosticsReport = {
  summary: string;
  totalProcessed: number;
  totalPromoted: number;
  totalSkipped: number;
  totalRecurrences: number;
  pressureIncreases: number;
  details: NutrientBridgeDiagnostic[];
};

export function buildNutrientBridgeDiagnosticsReport(
  diagnostics: NutrientBridgeDiagnostic[],
  totalProcessed: number,
): NutrientBridgeDiagnosticsReport {
  const promoted = diagnostics.filter(
    (d) => d.reason === "promoted_to_memory" || d.reason === "classified_as_recurrence",
  ).length;
  const skipped = diagnostics.filter((d) =>
    ["skipped_low_confidence", "skipped_informational", "skipped_duplicate",
     "skipped_below_threshold", "suppressed_ambiguity"].includes(d.reason),
  ).length;
  const recurrences = diagnostics.filter((d) => d.reason === "classified_as_recurrence").length;
  const pressureIncreases = diagnostics.filter((d) => d.pressureDelta > 0).length;

  return {
    summary: `bridge processed ${totalProcessed} nutrients: ${promoted} promoted (${recurrences} recurrences), ${skipped} skipped, ${pressureIncreases} pressure increases`,
    totalProcessed,
    totalPromoted: promoted,
    totalSkipped: skipped,
    totalRecurrences: recurrences,
    pressureIncreases,
    details: diagnostics,
  };
}

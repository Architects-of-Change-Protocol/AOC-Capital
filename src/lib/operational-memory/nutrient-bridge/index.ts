// ─── Public API ───────────────────────────────────────────────────────────────

export {
  bridgeNutrientsToOperationalMemory,
  bridgeSingleNutrientToOperationalMemory,
  classifyNutrientOperationalSignalPublic as classifyNutrientOperationalSignal,
  detectNutrientRecurrencePublic as detectNutrientRecurrence,
  linkNutrientToOperationalMemory,
} from "./nutrient-bridge-manager";

export {
  buildNutrientBridgeDiagnosticsReport,
  buildPromotionDiagnostic,
  buildSkipDiagnostic,
  explainPromotionReason,
  explainSkipReason,
  type NutrientBridgeDiagnosticsReport,
} from "./nutrient-bridge-diagnostics";

export { classifyNutrientOperationalSignal as classifyNutrient } from "./nutrient-signal-classifier";

export {
  calculateNutrientPressureContribution,
  deriveOperationalWeightsFromNutrient,
} from "./nutrient-pressure-calculator";

export { detectNutrientRecurrence as detectNutrientRecurrenceLowLevel } from "./nutrient-recurrence-detector";

export {
  buildNutrientMemoryLink,
  persistNutrientMemoryLink,
  updateOperationalMemoryRecordForRecurrence,
  type NutrientLinkPersistenceResult,
  type NutrientRecurrenceUpdateResult,
} from "./nutrient-memory-linker";

export {
  mapNutrientToMemoryRecord,
  buildNutrientMemoryMapping,
} from "./nutrient-to-memory-mapper";

// ─── Types ────────────────────────────────────────────────────────────────────

export type {
  NutrientLinkType,
  NutrientSkipReason,
  NutrientRecurrenceOutcome,
  NutrientRecurrenceResult,
  NutrientSignalCategory,
  NutrientSignalClassification,
  NutrientBridgePolicy,
  NutrientMemoryLink,
  NutrientMemoryMapping,
  NutrientBridgeDiagnosticReason,
  NutrientBridgeDiagnostic,
  NutrientOperationalBridgeInput,
  NutrientOperationalBridgeResult,
} from "./nutrient-bridge-types";

export { DEFAULT_NUTRIENT_BRIDGE_POLICY } from "./nutrient-bridge-types";

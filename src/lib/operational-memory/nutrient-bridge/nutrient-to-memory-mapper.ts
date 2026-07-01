import crypto from "node:crypto";
import type { VaultNutrient } from "@/lib/vault/digestive/types";
import type {
  OperationalIngestionSource,
  OperationalLineageType,
  OperationalMemoryRecord,
  OperationalMemoryScope,
  OperationalMemoryWeights,
  OperationalResolutionStatus,
} from "../runtime-memory-types";
import type {
  NutrientMemoryMapping,
  NutrientRecurrenceResult,
  NutrientSignalClassification,
  NutrientLinkType,
} from "./nutrient-bridge-types";

const BRIDGE_INGESTION_SOURCE: OperationalIngestionSource = "operational_summary";

// ─── Resolution status derivation ────────────────────────────────────────────

function deriveResolutionStatus(
  nutrientType: VaultNutrient["nutrientType"],
  recurrence: NutrientRecurrenceResult,
): OperationalResolutionStatus {
  if (nutrientType === "recovery_signal") return "resolved";
  if (recurrence.outcome === "escalation") return "escalated";
  return "unresolved";
}

// ─── Lineage type derivation ──────────────────────────────────────────────────

function deriveLineageType(outcome: NutrientRecurrenceResult["outcome"]): OperationalLineageType | null {
  switch (outcome) {
    case "recurrence":
      return "related_to";
    case "escalation":
      return "escalates_to";
    case "resolved_followup":
      return "resolved_by";
    default:
      return null;
  }
}

// ─── Link type derivation ─────────────────────────────────────────────────────

function deriveLinkType(outcome: NutrientRecurrenceResult["outcome"]): NutrientLinkType {
  switch (outcome) {
    case "recurrence":
      return "recurrence_match";
    case "escalation":
      return "escalation_match";
    case "resolved_followup":
      return "resolved_followup";
    default:
      return "promoted_from";
  }
}

// ─── Detail construction ──────────────────────────────────────────────────────

function buildDetail(nutrient: VaultNutrient, classification: NutrientSignalClassification): string {
  const parts: string[] = [];
  const firstEvidence = nutrient.evidence[0];
  if (firstEvidence?.excerpt) {
    parts.push(`Evidence: "${firstEvidence.excerpt.slice(0, 200)}"`);
  }
  if (firstEvidence?.confidenceBasis) {
    parts.push(`Basis: ${firstEvidence.confidenceBasis.slice(0, 120)}`);
  }
  parts.push(`Signal: ${classification.signalCategory} (${classification.operationalSeverity})`);
  return parts.join(" | ").slice(0, 1000);
}

// ─── Core mapping function ────────────────────────────────────────────────────

export function mapNutrientToMemoryRecord(
  nutrient: VaultNutrient,
  scope: OperationalMemoryScope,
  classification: NutrientSignalClassification,
  recurrence: NutrientRecurrenceResult,
  weights: OperationalMemoryWeights,
): OperationalMemoryRecord {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const resolutionStatus = deriveResolutionStatus(nutrient.nutrientType, recurrence);
  const parentRecordId =
    recurrence.matchingRecordId !== null &&
    recurrence.outcome !== "duplicate_noise"
      ? recurrence.matchingRecordId
      : null;
  const lineageType = deriveLineageType(recurrence.outcome);

  return {
    id,
    recordType: classification.suggestedMemoryType,
    summary: nutrient.summary.slice(0, 400),
    detail: buildDetail(nutrient, classification),
    scope,
    parentRecordId,
    lineageType,
    resolutionStatus,
    weights,
    confidence: classification.confidence,
    ingestionSource: BRIDGE_INGESTION_SOURCE,
    sourceRef: `nutrient_bridge:${nutrient.id}`,
    nutrientIds: [nutrient.id],
    interventionCount: 0,
    firstObservedAt: nutrient.createdAt,
    lastObservedAt: now,
    resolvedAt: resolutionStatus === "resolved" ? now : null,
    createdAt: now,
  };
}

// ─── Full mapping with link type ─────────────────────────────────────────────

export function buildNutrientMemoryMapping(
  nutrient: VaultNutrient,
  scope: OperationalMemoryScope,
  classification: NutrientSignalClassification,
  recurrence: NutrientRecurrenceResult,
  weights: OperationalMemoryWeights,
): NutrientMemoryMapping {
  const memoryRecord = mapNutrientToMemoryRecord(
    nutrient,
    scope,
    classification,
    recurrence,
    weights,
  );

  return {
    nutrientId: nutrient.id,
    nutrientType: nutrient.nutrientType,
    memoryRecord,
    isNew: recurrence.outcome === "new_record",
    classification,
    recurrence,
    pressureContribution: weights.operationalPressureWeight,
    linkType: deriveLinkType(recurrence.outcome),
  };
}

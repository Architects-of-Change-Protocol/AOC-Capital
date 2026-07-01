import type { VaultNutrient } from "@/lib/vault/digestive/types";
import type { OperationalMemoryRecord, OperationalMemoryScope } from "../runtime-memory-types";
import { persistOperationalMemoryRecord } from "../runtime-memory-persistence";
import {
  DEFAULT_NUTRIENT_BRIDGE_POLICY,
  type NutrientBridgePolicy,
  type NutrientLinkType,
  type NutrientMemoryLink,
  type NutrientOperationalBridgeInput,
  type NutrientOperationalBridgeResult,
  type NutrientRecurrenceResult,
  type NutrientSignalClassification,
  type NutrientSkipReason,
} from "./nutrient-bridge-types";
import { classifyNutrientOperationalSignal } from "./nutrient-signal-classifier";
import {
  calculateNutrientPressureContribution,
  deriveOperationalWeightsFromNutrient,
} from "./nutrient-pressure-calculator";
import { detectNutrientRecurrence } from "./nutrient-recurrence-detector";
import { buildNutrientMemoryMapping } from "./nutrient-to-memory-mapper";
import {
  buildNutrientMemoryLink,
  persistNutrientMemoryLink,
  updateOperationalMemoryRecordForRecurrence,
} from "./nutrient-memory-linker";
import {
  buildPromotionDiagnostic,
  buildSkipDiagnostic,
} from "./nutrient-bridge-diagnostics";

// ─── Policy helpers ───────────────────────────────────────────────────────────

function mergePolicy(partial?: Partial<NutrientBridgePolicy>): NutrientBridgePolicy {
  return { ...DEFAULT_NUTRIENT_BRIDGE_POLICY, ...partial };
}

// ─── Suppression check ────────────────────────────────────────────────────────

function shouldSuppressNutrient(
  nutrient: VaultNutrient,
  classification: NutrientSignalClassification,
  policy: NutrientBridgePolicy,
): { suppress: boolean; reason: NutrientSkipReason | null } {
  if (classification.confidence < policy.minimumConfidence) {
    return { suppress: true, reason: "low_confidence" };
  }

  if (nutrient.scoring.significanceScore < policy.minimumSignificanceScore) {
    return { suppress: true, reason: "below_significance_threshold" };
  }

  if (
    policy.suppressInformationalOnly &&
    nutrient.scoring.actionability === "informational" &&
    nutrient.scoring.significanceScore < 0.55
  ) {
    return { suppress: true, reason: "informational_only" };
  }

  if (
    policy.suppressAmbiguityWithoutRecurrence &&
    nutrient.nutrientType === "ambiguity_signal" &&
    nutrient.scoring.recurrenceHint === "first_occurrence"
  ) {
    return { suppress: true, reason: "ambiguity_signal_suppressed" };
  }

  return { suppress: false, reason: null };
}

// ─── Bridge scope builder ─────────────────────────────────────────────────────

function buildBridgeScope(
  companyId: string,
  workspaceId: string,
  projectId: string | null,
): OperationalMemoryScope {
  return {
    companyId,
    workspaceId,
    projectId,
    conversationId: null,
    interventionId: null,
    stakeholderId: null,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Primary bridge function. Converts high-significance vault nutrients into
 * operational memory records with lineage, recurrence detection, and links.
 *
 * Tenant isolation: companyId + workspaceId + projectId are required.
 * Does not cross workspace/project boundaries.
 */
export async function bridgeNutrientsToOperationalMemory(
  input: NutrientOperationalBridgeInput,
): Promise<NutrientOperationalBridgeResult> {
  const processedAt = new Date().toISOString();

  if (!input.companyId || !input.workspaceId) {
    return buildEmptyResult(input, processedAt, "missing_scope_companyId_or_workspaceId");
  }

  const policy = mergePolicy(input.policy);
  const scope = buildBridgeScope(input.companyId, input.workspaceId, input.projectId);
  const existingRecords = input.existingRecords ?? [];
  const existingLinks = input.existingLinks ?? [];

  const created: OperationalMemoryRecord[] = [];
  const updated: OperationalMemoryRecord[] = [];
  const linked: NutrientMemoryLink[] = [];
  const recurrenceMatches: NutrientRecurrenceResult[] = [];
  const skipped: NutrientOperationalBridgeResult["skipped"] = [];
  const diagnostics: NutrientOperationalBridgeResult["diagnostics"] = [];

  // Track nutrient IDs processed in this run to catch in-run duplicates
  const processedInRun = new Set<string>();

  for (const nutrient of input.nutrients) {
    // ── In-run duplicate guard ────────────────────────────────────────────
    if (processedInRun.has(nutrient.id)) {
      skipped.push({ nutrientId: nutrient.id, nutrientType: nutrient.nutrientType, reason: "duplicate_recent" });
      diagnostics.push(buildSkipDiagnostic(nutrient, "duplicate_recent"));
      continue;
    }
    processedInRun.add(nutrient.id);

    // ── Scope validation ──────────────────────────────────────────────────
    if (nutrient.workspaceId !== input.workspaceId) {
      skipped.push({ nutrientId: nutrient.id, nutrientType: nutrient.nutrientType, reason: "out_of_scope" });
      diagnostics.push(buildSkipDiagnostic(nutrient, "out_of_scope"));
      continue;
    }

    // ── Signal classification ─────────────────────────────────────────────
    const classification = classifyNutrientOperationalSignal(nutrient);

    // ── Policy suppression check ──────────────────────────────────────────
    const { suppress, reason: suppressReason } = shouldSuppressNutrient(nutrient, classification, policy);
    if (suppress && suppressReason) {
      skipped.push({ nutrientId: nutrient.id, nutrientType: nutrient.nutrientType, reason: suppressReason });
      diagnostics.push(buildSkipDiagnostic(nutrient, suppressReason));
      continue;
    }

    // ── Recurrence detection ──────────────────────────────────────────────
    const allKnownLinks = [...existingLinks, ...linked];
    const recurrence = detectNutrientRecurrence(
      nutrient,
      classification,
      [...existingRecords, ...created],
      allKnownLinks,
    );

    // ── Duplicate noise: already linked in prior state ────────────────────
    if (recurrence.outcome === "duplicate_noise") {
      skipped.push({ nutrientId: nutrient.id, nutrientType: nutrient.nutrientType, reason: "already_linked" });
      diagnostics.push(buildSkipDiagnostic(nutrient, "already_linked"));
      continue;
    }

    // ── Pressure and weights ──────────────────────────────────────────────
    const pressureContribution = calculateNutrientPressureContribution(nutrient, classification);
    const weights = deriveOperationalWeightsFromNutrient(nutrient, classification);

    // ── Map to memory record ──────────────────────────────────────────────
    const mapping = buildNutrientMemoryMapping(
      nutrient,
      scope,
      classification,
      recurrence,
      weights,
    );

    // ── Persist the new record ────────────────────────────────────────────
    const persistResult = await persistOperationalMemoryRecord(mapping.memoryRecord);
    if (persistResult.status === "failed") {
      // Log as diagnostic but don't halt the run
      diagnostics.push({
        nutrientId: nutrient.id,
        nutrientType: nutrient.nutrientType,
        reason: "skipped_below_threshold",
        explanation: `persistence failed: ${persistResult.error ?? "unknown"}`,
        classification,
        recurrenceOutcome: recurrence.outcome,
        pressureDelta: 0,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    created.push(mapping.memoryRecord);

    // ── Update existing record if recurrence ──────────────────────────────
    if (
      recurrence.matchingRecordId &&
      (recurrence.outcome === "recurrence" || recurrence.outcome === "escalation" || recurrence.outcome === "resolved_followup")
    ) {
      await updateOperationalMemoryRecordForRecurrence(
        recurrence.matchingRecordId,
        input.companyId,
        nutrient.id,
      );
      const existingRecord = existingRecords.find((r) => r.id === recurrence.matchingRecordId);
      if (existingRecord) {
        updated.push(existingRecord);
      }
      recurrenceMatches.push(recurrence);
    }

    // ── Build and persist link ────────────────────────────────────────────
    const link = buildNutrientMemoryLink(
      nutrient.id,
      mapping.memoryRecord.id,
      mapping.linkType,
      { companyId: input.companyId, workspaceId: input.workspaceId, projectId: input.projectId },
      classification.confidence,
      {
        nutrientType: nutrient.nutrientType,
        signalCategory: classification.signalCategory,
        operationalSeverity: classification.operationalSeverity,
        recurrenceOutcome: recurrence.outcome,
        pressureContribution,
      },
    );

    await persistNutrientMemoryLink(link);
    linked.push(link);

    // ── Diagnostic ────────────────────────────────────────────────────────
    diagnostics.push(buildPromotionDiagnostic(nutrient, classification, recurrence, pressureContribution));
  }

  return {
    created,
    updated,
    linked,
    recurrenceMatches,
    skipped,
    diagnostics,
    scopeMetadata: {
      companyId: input.companyId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      processedAt,
    },
    lineageMetadata: {
      totalLinked: linked.length,
      totalSkipped: skipped.length,
      totalCreated: created.length,
      totalUpdated: updated.length,
      totalRecurrences: recurrenceMatches.length,
    },
  };
}

/**
 * Bridge a single nutrient. Useful for integration hooks that process one
 * nutrient at a time (e.g. after vault digestion of a single document).
 */
export async function bridgeSingleNutrientToOperationalMemory(
  nutrient: VaultNutrient,
  context: {
    companyId: string;
    workspaceId: string;
    projectId: string | null;
    existingRecords?: OperationalMemoryRecord[];
    existingLinks?: NutrientMemoryLink[];
    policy?: Partial<NutrientBridgePolicy>;
  },
): Promise<NutrientOperationalBridgeResult> {
  return bridgeNutrientsToOperationalMemory({
    nutrients: [nutrient],
    companyId: context.companyId,
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    existingRecords: context.existingRecords,
    existingLinks: context.existingLinks,
    policy: context.policy,
  });
}

/**
 * Classify a nutrient's operational signal without persisting anything.
 * Safe to call anywhere for read-only analysis.
 */
export function classifyNutrientOperationalSignalPublic(
  nutrient: VaultNutrient,
): NutrientSignalClassification {
  return classifyNutrientOperationalSignal(nutrient);
}

/**
 * Detect recurrence without persisting anything.
 * Safe to call for dry-run analysis.
 */
export function detectNutrientRecurrencePublic(
  nutrient: VaultNutrient,
  existingRecords: OperationalMemoryRecord[],
  existingLinks: NutrientMemoryLink[] = [],
): NutrientRecurrenceResult {
  const classification = classifyNutrientOperationalSignal(nutrient);
  return detectNutrientRecurrence(nutrient, classification, existingRecords, existingLinks);
}

/**
 * Build and persist a single bidirectional link between a nutrient and a
 * memory record. Use when manually linking after the fact.
 */
export async function linkNutrientToOperationalMemory(
  nutrientId: string,
  memoryRecordId: string,
  linkType: NutrientLinkType,
  scope: { companyId: string; workspaceId: string; projectId: string | null },
  confidence = 0.7,
): Promise<NutrientMemoryLink> {
  const link = buildNutrientMemoryLink(
    nutrientId,
    memoryRecordId,
    linkType,
    scope,
    confidence,
  );
  await persistNutrientMemoryLink(link);
  return link;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function buildEmptyResult(
  input: NutrientOperationalBridgeInput,
  processedAt: string,
  reason: string,
): NutrientOperationalBridgeResult {
  return {
    created: [],
    updated: [],
    linked: [],
    recurrenceMatches: [],
    skipped: input.nutrients.map((n) => ({
      nutrientId: n.id,
      nutrientType: n.nutrientType,
      reason: "out_of_scope" as NutrientSkipReason,
    })),
    diagnostics: input.nutrients.map((n) => ({
      nutrientId: n.id,
      nutrientType: n.nutrientType,
      reason: "skipped_below_threshold" as const,
      explanation: reason,
      classification: null,
      recurrenceOutcome: null,
      pressureDelta: 0,
      timestamp: processedAt,
    })),
    scopeMetadata: {
      companyId: input.companyId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      processedAt,
    },
    lineageMetadata: {
      totalLinked: 0,
      totalSkipped: input.nutrients.length,
      totalCreated: 0,
      totalUpdated: 0,
      totalRecurrences: 0,
    },
  };
}

import type { VaultNutrient } from "@/lib/vault/digestive/types";
import type { OperationalMemoryRecord, OperationalMemoryRecordType } from "../runtime-memory-types";
import type {
  NutrientMemoryLink,
  NutrientRecurrenceOutcome,
  NutrientRecurrenceResult,
  NutrientSignalClassification,
} from "./nutrient-bridge-types";
import { NUTRIENT_TYPE_MAP } from "./nutrient-signal-classifier";

// ─── Text normalization for comparison ───────────────────────────────────────

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function wordOverlapScore(a: string, b: string): number {
  const wordsA = new Set(normalizeForComparison(a).split(" ").filter((w) => w.length > 3));
  const wordsB = new Set(normalizeForComparison(b).split(" ").filter((w) => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}

// ─── Record type compatibility ────────────────────────────────────────────────

const RECURRENCE_COMPATIBLE_TYPES: Partial<Record<OperationalMemoryRecordType, OperationalMemoryRecordType[]>> = {
  blocker: ["blocker"],
  risk: ["risk"],
  escalation: ["escalation", "blocker"],
  delivery_pressure: ["delivery_pressure", "risk"],
  dependency: ["dependency"],
  stakeholder_signal: ["stakeholder_signal"],
  governance_gap: ["governance_gap"],
  timeline_signal: ["timeline_signal", "delivery_pressure"],
  decision: ["decision"],
  commitment: ["commitment"],
  recovery: ["recovery", "blocker", "risk", "delivery_pressure"],
};

function isCompatibleRecordType(
  suggestedType: OperationalMemoryRecordType,
  existingType: OperationalMemoryRecordType,
): boolean {
  const compatible = RECURRENCE_COMPATIBLE_TYPES[suggestedType];
  if (!compatible) return suggestedType === existingType;
  return compatible.includes(existingType);
}

// ─── Recurrence detection ─────────────────────────────────────────────────────

const TEXT_SIMILARITY_THRESHOLD = 0.35;

/**
 * Detects whether a new nutrient represents recurrence, escalation, or a
 * resolved followup for existing operational memory records.
 *
 * Rules are fully deterministic — rule-based text comparison only.
 */
export function detectNutrientRecurrence(
  nutrient: VaultNutrient,
  classification: NutrientSignalClassification,
  existingRecords: OperationalMemoryRecord[],
  existingLinks: NutrientMemoryLink[],
): NutrientRecurrenceResult {
  const evidenceTrail: string[] = [];

  // ── 1. Duplicate check: same nutrient already linked ─────────────────────
  const alreadyLinked = existingLinks.some((l) => l.nutrientId === nutrient.id);
  if (alreadyLinked) {
    const link = existingLinks.find((l) => l.nutrientId === nutrient.id)!;
    return {
      outcome: "duplicate_noise",
      matchingRecordId: link.operationalMemoryRecordId,
      recurrenceCount: 1,
      recurrenceReason: "nutrient_already_linked",
      evidenceTrail: [`nutrient ${nutrient.id} already linked to record ${link.operationalMemoryRecordId}`],
    };
  }

  // ── 2. Filter records to same workspace + project scope ──────────────────
  const scopedRecords = existingRecords.filter((r) => {
    const wsMatch = r.scope.workspaceId === nutrient.workspaceId;
    const projMatch =
      nutrient.projectId === null || r.scope.projectId === nutrient.projectId;
    return wsMatch && projMatch;
  });

  if (scopedRecords.length === 0) {
    return {
      outcome: "new_record",
      matchingRecordId: null,
      recurrenceCount: 0,
      recurrenceReason: "no_existing_records_in_scope",
      evidenceTrail: [],
    };
  }

  // ── 3. Nutrient's own recurrence hint is a primary signal ────────────────
  const hasConfirmedRecurrence =
    nutrient.scoring.recurrenceHint === "confirmed_recurrence";
  const hasPossibleRecurrence =
    nutrient.scoring.recurrenceHint === "possible_recurrence";

  if (hasConfirmedRecurrence) {
    evidenceTrail.push(`nutrient.scoring.recurrenceHint = confirmed_recurrence`);
  }

  // ── 4. Recovery signal → look for an unresolved record to close ──────────
  if (nutrient.nutrientType === "recovery_signal") {
    const unresolved = scopedRecords.filter(
      (r) =>
        ["unresolved", "in_progress", "escalated"].includes(r.resolutionStatus) &&
        wordOverlapScore(r.summary, nutrient.summary) >= TEXT_SIMILARITY_THRESHOLD,
    );
    if (unresolved.length > 0) {
      const target = unresolved[0];
      return {
        outcome: "resolved_followup",
        matchingRecordId: target.id,
        recurrenceCount: 1,
        recurrenceReason: "recovery_signal_closes_unresolved_record",
        evidenceTrail: [
          ...evidenceTrail,
          `recovery signal matched unresolved record ${target.id} (type: ${target.recordType})`,
          `text overlap: ${wordOverlapScore(target.summary, nutrient.summary).toFixed(2)}`,
        ],
      };
    }
  }

  // ── 5. Escalation signal → look for escalatable records ──────────────────
  if (nutrient.nutrientType === "escalation_signal") {
    const escalatable = scopedRecords.filter(
      (r) =>
        ["unresolved", "in_progress"].includes(r.resolutionStatus) &&
        isCompatibleRecordType("escalation", r.recordType) &&
        wordOverlapScore(r.summary, nutrient.summary) >= TEXT_SIMILARITY_THRESHOLD * 0.8,
    );
    if (escalatable.length > 0) {
      const target = escalatable[0];
      return {
        outcome: "escalation",
        matchingRecordId: target.id,
        recurrenceCount: (target.nutrientIds?.length ?? 0) + 1,
        recurrenceReason: "escalation_signal_escalates_existing_record",
        evidenceTrail: [
          ...evidenceTrail,
          `escalation signal matched record ${target.id} (type: ${target.recordType})`,
          `text overlap: ${wordOverlapScore(target.summary, nutrient.summary).toFixed(2)}`,
        ],
      };
    }
  }

  // ── 6. Match against compatible unresolved records by type + text ─────────
  const suggestedType = classification.suggestedMemoryType;
  const candidates = scopedRecords.filter(
    (r) =>
      isCompatibleRecordType(suggestedType, r.recordType) &&
      ["unresolved", "in_progress", "escalated"].includes(r.resolutionStatus),
  );

  let bestMatch: OperationalMemoryRecord | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = wordOverlapScore(candidate.summary, nutrient.summary);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  // ── 7. Use recurrenceHint + text similarity together ─────────────────────
  const recurrenceThreshold = hasConfirmedRecurrence
    ? TEXT_SIMILARITY_THRESHOLD * 0.6 // confirmed recurrence → lower text bar
    : hasPossibleRecurrence
      ? TEXT_SIMILARITY_THRESHOLD * 0.8
      : TEXT_SIMILARITY_THRESHOLD;

  if (bestMatch && bestScore >= recurrenceThreshold) {
    const isEscalation =
      nutrient.scoring.recurrenceHint === "confirmed_recurrence" &&
      bestMatch.weights.operationalPressureWeight >= 0.8;

    return {
      outcome: isEscalation ? "escalation" : "recurrence",
      matchingRecordId: bestMatch.id,
      recurrenceCount: (bestMatch.nutrientIds?.length ?? 0) + 1,
      recurrenceReason: isEscalation
        ? "confirmed_recurrence_with_high_pressure_record"
        : hasConfirmedRecurrence
          ? "confirmed_recurrence_matched_existing_record"
          : "text_and_type_overlap_match",
      evidenceTrail: [
        ...evidenceTrail,
        `matched record ${bestMatch.id} (type: ${bestMatch.recordType})`,
        `text overlap: ${bestScore.toFixed(2)}, threshold: ${recurrenceThreshold.toFixed(2)}`,
        `existing record status: ${bestMatch.resolutionStatus}`,
      ],
    };
  }

  return {
    outcome: "new_record",
    matchingRecordId: null,
    recurrenceCount: 0,
    recurrenceReason:
      bestMatch && bestScore > 0
        ? `closest match score ${bestScore.toFixed(2)} below threshold ${recurrenceThreshold.toFixed(2)}`
        : "no_comparable_record_found",
    evidenceTrail,
  };
}

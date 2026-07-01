import type { VaultNutrient, VaultNutrientType } from "@/lib/vault/digestive/types";
import type {
  OperationalMemoryRecord,
  OperationalMemoryRecordType,
} from "../runtime-memory-types";

// ─── Link types ───────────────────────────────────────────────────────────────

export type NutrientLinkType =
  | "promoted_from"
  | "recurrence_match"
  | "escalation_match"
  | "resolved_followup"
  | "lineage_reference";

// ─── Skip reasons ─────────────────────────────────────────────────────────────

export type NutrientSkipReason =
  | "duplicate_recent"
  | "low_confidence"
  | "informational_only"
  | "already_linked"
  | "out_of_scope"
  | "below_significance_threshold"
  | "ambiguity_signal_suppressed";

// ─── Recurrence outcome ───────────────────────────────────────────────────────

export type NutrientRecurrenceOutcome =
  | "new_record"
  | "recurrence"
  | "escalation"
  | "duplicate_noise"
  | "resolved_followup";

export type NutrientRecurrenceResult = {
  outcome: NutrientRecurrenceOutcome;
  matchingRecordId: string | null;
  recurrenceCount: number;
  recurrenceReason: string;
  evidenceTrail: string[];
};

// ─── Signal classification ────────────────────────────────────────────────────

export type NutrientSignalCategory =
  | "blocker"
  | "risk"
  | "dependency"
  | "commitment"
  | "escalation"
  | "stakeholder_alignment"
  | "procurement_pressure"
  | "timeline_pressure"
  | "governance_gap"
  | "delivery_pressure"
  | "unresolved_decision"
  | "weak_signal";

export type NutrientSignalClassification = {
  signalCategory: NutrientSignalCategory;
  operationalSeverity: "low" | "medium" | "high" | "critical";
  confidence: number;
  unresolved: boolean;
  pressureImpact: "none" | "low" | "medium" | "high";
  deliveryImpact: "none" | "low" | "medium" | "high";
  suggestedMemoryType: OperationalMemoryRecordType;
};

// ─── Bridge policy ────────────────────────────────────────────────────────────

export type NutrientBridgePolicy = {
  /** Minimum significance score to promote to operational memory (0..1). Default 0.35 */
  minimumSignificanceScore: number;
  /** Minimum confidence after ambiguity adjustment to promote. Default 0.45 */
  minimumConfidence: number;
  /** Skip nutrients that are informational-only with low significance. Default true */
  suppressInformationalOnly: boolean;
  /** Skip ambiguity_signals on first occurrence without recurrence hint. Default true */
  suppressAmbiguityWithoutRecurrence: boolean;
  /** Window in ms within which the same nutrient ID is considered a duplicate. Default 15min */
  dedupWindowMs: number;
};

export const DEFAULT_NUTRIENT_BRIDGE_POLICY: NutrientBridgePolicy = {
  minimumSignificanceScore: 0.35,
  minimumConfidence: 0.45,
  suppressInformationalOnly: true,
  suppressAmbiguityWithoutRecurrence: true,
  dedupWindowMs: 15 * 60 * 1000,
};

// ─── Memory link ──────────────────────────────────────────────────────────────

export type NutrientMemoryLink = {
  id: string;
  companyId: string;
  workspaceId: string;
  projectId: string | null;
  nutrientId: string;
  operationalMemoryRecordId: string;
  linkType: NutrientLinkType;
  confidence: number;
  createdAt: string;
  metadata: Record<string, unknown>;
};

// ─── Memory mapping ───────────────────────────────────────────────────────────

export type NutrientMemoryMapping = {
  nutrientId: string;
  nutrientType: VaultNutrientType;
  memoryRecord: OperationalMemoryRecord;
  isNew: boolean;
  classification: NutrientSignalClassification;
  recurrence: NutrientRecurrenceResult;
  pressureContribution: number;
  linkType: NutrientLinkType;
};

// ─── Diagnostics ──────────────────────────────────────────────────────────────

export type NutrientBridgeDiagnosticReason =
  | "promoted_to_memory"
  | "skipped_low_confidence"
  | "skipped_informational"
  | "skipped_duplicate"
  | "skipped_below_threshold"
  | "classified_as_recurrence"
  | "pressure_increased"
  | "lineage_linked"
  | "confidence_downgraded"
  | "suppressed_ambiguity";

export type NutrientBridgeDiagnostic = {
  nutrientId: string;
  nutrientType: VaultNutrientType;
  reason: NutrientBridgeDiagnosticReason;
  explanation: string;
  classification: NutrientSignalClassification | null;
  recurrenceOutcome: NutrientRecurrenceOutcome | null;
  pressureDelta: number;
  timestamp: string;
};

// ─── Bridge input / result ────────────────────────────────────────────────────

export type NutrientOperationalBridgeInput = {
  nutrients: VaultNutrient[];
  /** Required: company scope for operational memory. Vault uses workspaceId; bridge requires explicit companyId. */
  companyId: string;
  workspaceId: string;
  projectId: string | null;
  policy?: Partial<NutrientBridgePolicy>;
  /** Pre-loaded existing records for recurrence detection (avoids extra DB round-trips). */
  existingRecords?: OperationalMemoryRecord[];
  /** Pre-loaded existing links for duplicate suppression. */
  existingLinks?: NutrientMemoryLink[];
};

export type NutrientOperationalBridgeResult = {
  created: OperationalMemoryRecord[];
  updated: OperationalMemoryRecord[];
  linked: NutrientMemoryLink[];
  recurrenceMatches: NutrientRecurrenceResult[];
  skipped: Array<{
    nutrientId: string;
    nutrientType: VaultNutrientType;
    reason: NutrientSkipReason;
  }>;
  diagnostics: NutrientBridgeDiagnostic[];
  scopeMetadata: {
    companyId: string;
    workspaceId: string;
    projectId: string | null;
    processedAt: string;
  };
  lineageMetadata: {
    totalLinked: number;
    totalSkipped: number;
    totalCreated: number;
    totalUpdated: number;
    totalRecurrences: number;
  };
};

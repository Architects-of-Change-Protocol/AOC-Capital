/**
 * Core types for the Vault Digestive System.
 *
 * The vault is not a storage bucket — it is a semantic substrate that digests
 * raw organizational material into durable, evidence-backed nutrients that
 * PMFreak can reason about over time.
 */

// ─── Raw Material ─────────────────────────────────────────────────────────────

export type VaultRawMaterialType =
  | "project_note"
  | "uploaded_text"
  | "meeting_transcript"
  | "email_update"
  | "risk_blocker_note"
  | "stakeholder_communication"
  | "operational_update";

export type VaultRawMaterial = {
  /** Source artifact ID if known (e.g. upload record id) */
  id: string | null;
  type: VaultRawMaterialType;
  title: string | null;
  content: string;
  /** Required for tenant scoping — every artifact belongs to a workspace */
  workspaceId: string;
  projectId: string | null;
  actorUserId: string | null;
  /** Opaque lineage reference (e.g. "user_id:mode") */
  sourceRef: string;
  submittedAt: string; // ISO-8601
};

// ─── Digestive Context ────────────────────────────────────────────────────────

export type VaultDigestiveContext = {
  workspaceId: string;
  projectId: string | null;
  actorUserId: string | null;
  /** Identifies this specific digestion run — used as the run ID */
  traceId: string;
  digestedAt: string; // ISO-8601
};

// ─── Extracted Entities ───────────────────────────────────────────────────────

export type VaultExtractedEntityType =
  | "person"
  | "organization"
  | "project"
  | "vendor"
  | "blocker"
  | "risk"
  | "decision"
  | "dependency"
  | "commitment"
  | "deliverable"
  | "date"
  | "approval"
  | "financial_constraint"
  | "technical_constraint"
  | "governance_event";

export type VaultExtractedEntity = {
  entityType: VaultExtractedEntityType;
  value: string;
  excerpt: string;
  confidence: number; // 0..1
};

// ─── Semantic Nutrients ───────────────────────────────────────────────────────

export type VaultNutrientType =
  | "risk_signal"
  | "blocker_signal"
  | "stakeholder_signal"
  | "dependency_signal"
  | "decision_signal"
  | "commitment_signal"
  | "delivery_drift_signal"
  | "financial_impediment_signal"
  | "governance_gap_signal"
  | "escalation_signal"
  | "recovery_signal"
  | "ambiguity_signal"
  | "contradiction_signal"
  | "timeline_pressure_signal";

// ─── Evidence Lineage ─────────────────────────────────────────────────────────

export type VaultEvidenceLineage = {
  sourceArtifactId: string | null;
  sourceType: VaultRawMaterialType;
  sourceTitle: string | null;
  /** Short text excerpt — never the full document */
  excerpt: string;
  timestamp: string;
  workspaceId: string;
  projectId: string | null;
  actorUserId: string | null;
  /** Human-readable explanation of why we believe this */
  confidenceBasis: string;
  extractionMethod: "rule_based" | "pattern_match" | "heuristic";
};

// ─── Nutrient Scoring ─────────────────────────────────────────────────────────

export type VaultNutrientScoring = {
  confidence: number; // 0..1
  severity: "low" | "medium" | "high" | "critical";
  /** 1 = very fresh (just created); decays over time via decay utilities */
  freshness: number; // 0..1
  recurrenceHint: "first_occurrence" | "possible_recurrence" | "confirmed_recurrence";
  ambiguityLevel: "clear" | "ambiguous" | "highly_ambiguous";
  actionability: "actionable" | "monitor" | "informational";
  evidenceStrength: "weak" | "moderate" | "strong";
  /** How quickly this nutrient loses relevance without reinforcement */
  decayProfile: "fast" | "medium" | "slow" | "persistent";
  /** Deterministic significance score 0..1 — higher = more operationally meaningful */
  significanceScore: number;
};

// ─── Nutrient ─────────────────────────────────────────────────────────────────

export type VaultNutrient = {
  id: string;
  nutrientType: VaultNutrientType;
  summary: string;
  entities: VaultExtractedEntity[];
  /** One or more evidence references that support this nutrient */
  evidence: VaultEvidenceLineage[];
  scoring: VaultNutrientScoring;
  /** How many duplicate candidates were compressed into this nutrient */
  duplicateMergeCount: number;
  workspaceId: string;
  projectId: string | null;
  digestionRunId: string;
  createdAt: string;
};

// ─── Semantic Residue ─────────────────────────────────────────────────────────

export type VaultSemanticResidue = {
  id: string;
  residueCategory:
    | "vague_concern"
    | "unclear_dependency"
    | "incomplete_stakeholder_mention"
    | "possible_risk"
    | "unresolved_timeline_reference"
    | "ambiguous_ownership";
  rawExcerpt: string;
  rationale: string;
  workspaceId: string;
  projectId: string | null;
  digestionRunId: string;
  createdAt: string;
};

// ─── Digestive Pass ───────────────────────────────────────────────────────────

export type VaultDigestivePass = {
  runId: string;
  rawMaterialId: string | null;
  workspaceId: string;
  projectId: string | null;
  actorUserId: string | null;
  startedAt: string;
  completedAt: string;
  extractionMethod: "rule_based";
  nutrientCount: number;
  residueCount: number;
  entityCount: number;
  /** Candidates suppressed by significance/stakeholder filtering */
  suppressedCandidateCount: number;
};

// ─── Digestion Result ─────────────────────────────────────────────────────────

export type VaultDigestionResult = {
  digestivePass: VaultDigestivePass;
  nutrients: VaultNutrient[];
  residue: VaultSemanticResidue[];
  entities: VaultExtractedEntity[];
};

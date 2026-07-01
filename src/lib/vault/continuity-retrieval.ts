import type { VaultEvidenceLineage, VaultNutrient, VaultNutrientType } from "@/lib/vault/digestive/types";

const MAX_CONTINUITY_SIGNALS = 24;
const MAX_EVIDENCE_EXCERPTS = 10;
const MAX_SUMMARY_ITEMS = 6;
const DEFAULT_MAX_NUTRIENTS = 40;
const DEFAULT_MAX_EVIDENCE = 8;
const MAX_EXCERPT_CHARS = 240;

export type OperationalContinuityRequest = {
  companyId: string;
  workspaceId: string;
  projectId?: string | null;
  sessionKey?: string | null;
  actorUserId?: string | null;
  activeDomain?: "delivery" | "risk" | "governance" | "stakeholder" | "financial" | "timeline" | "general";
  currentMessage: string;
  maxNutrients?: number;
  maxEvidence?: number;
  includeResolved?: boolean;
};

export type ContinuitySignal = {
  nutrientId: string;
  type: string;
  relevanceScore: number;
  urgency: "low" | "medium" | "high" | "critical";
  continuityReason: string;
  evidenceExcerpt: string;
  createdAt: string;
  recurrenceCount?: number;
  unresolved: boolean;
  stakeholders?: string[];
  sourceType?: string;
};

export type OperationalContinuityResult = {
  retrievedAt: string;
  status: "ok" | "empty" | "degraded" | "failed";
  continuityScore: number;
  continuitySignals: ContinuitySignal[];
  unresolvedBlockers: ContinuitySignal[];
  escalationSignals: ContinuitySignal[];
  recurringPatterns: ContinuitySignal[];
  stakeholderPressureSignals: ContinuitySignal[];
  suggestedAttentionAreas: string[];
  continuitySummary: string[];
  boundedEvidence: string[];
  degradationReason?: string;
};

const TYPE_WEIGHT: Record<VaultNutrientType, number> = {
  blocker_signal: 1,
  escalation_signal: 1,
  delivery_drift_signal: 0.84,
  financial_impediment_signal: 0.84,
  dependency_signal: 0.82,
  timeline_pressure_signal: 0.8,
  governance_gap_signal: 0.62,
  stakeholder_signal: 0.58,
  risk_signal: 0.6,
  commitment_signal: 0.7,
  decision_signal: 0.52,
  ambiguity_signal: 0.5,
  contradiction_signal: 0.66,
  recovery_signal: 0.3,
};

export function normalizeContinuityText(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function extractOperationalKeywords(input: string): string[] {
  const stop = new Set(["the", "and", "for", "with", "from", "this", "that", "have", "has", "are", "was", "were", "about", "into", "over", "after", "before", "will", "would", "could", "should"]);
  return Array.from(new Set(normalizeContinuityText(input).split(" ").filter((w) => w.length >= 4 && !stop.has(w)))).sort();
}

export function calculateKeywordOverlap(message: string, evidence: string): number {
  const left = extractOperationalKeywords(message);
  const right = new Set(extractOperationalKeywords(evidence));
  if (!left.length || !right.size) return 0;
  const hit = left.filter((token) => right.has(token)).length;
  return Math.min(1, hit / left.length);
}

const excerptFromEvidence = (evidence: VaultEvidenceLineage[]): { excerpt: string; sourceType?: string } => {
  const first = evidence[0];
  if (!first) return { excerpt: "" };
  const cleaned = first.excerpt.replace(/\s+/g, " ").trim().slice(0, MAX_EXCERPT_CHARS);
  return { excerpt: cleaned, sourceType: first.sourceType };
};

const resolvedNutrient = (n: VaultNutrient): boolean => n.nutrientType === "recovery_signal" || /\b(resolved|closed|completed|unblocked|recovered)\b/i.test(n.summary);

const isRecurring = (n: VaultNutrient): boolean => n.scoring.recurrenceHint !== "first_occurrence" || n.duplicateMergeCount > 0;

export function classifyContinuityUrgency(input: { unresolved: boolean; nutrientType: string; recurrenceCount: number; createdAt: string; }): ContinuitySignal["urgency"] {
  const isEscalation = input.nutrientType === "escalation_signal";
  const isBlocker = input.nutrientType === "blocker_signal";
  const isDependency = input.nutrientType === "dependency_signal";
  const isGovernance = input.nutrientType === "governance_gap_signal";
  const ageDays = Math.max(0, (Date.now() - Date.parse(input.createdAt)) / 86400000);
  if (input.unresolved && isEscalation && input.recurrenceCount >= 2) return "critical";
  if (input.unresolved && isBlocker) return "high";
  if (input.recurrenceCount >= 2 && isDependency) return "high";
  if (isEscalation && ageDays <= 7) return "high";
  if (isGovernance) return "medium";
  return input.unresolved ? "medium" : "low";
}

export function scoreContinuityCandidate(input: { nutrient: VaultNutrient; recurrenceCount: number; keywordOverlap: number; activeDomain: OperationalContinuityRequest["activeDomain"]; includeResolved: boolean; }): number {
  const { nutrient } = input;
  const ageDays = Math.max(0, (Date.now() - Date.parse(nutrient.createdAt)) / 86400000);
  const recency = Math.max(0.1, 1 - ageDays / 45);
  const severityMap = { low: 0.3, medium: 0.55, high: 0.8, critical: 1 } as const;
  const severity = severityMap[nutrient.scoring.severity] ?? 0.4;
  const recurrence = Math.min(1, input.recurrenceCount / 4);
  const unresolved = !resolvedNutrient(nutrient);
  const resolutionFactor = unresolved ? 1 : input.includeResolved ? 0.2 : 0;
  const domainBoost = (() => {
    if (!input.activeDomain || input.activeDomain === "general") return 0;
    if (input.activeDomain === "financial" && nutrient.nutrientType === "financial_impediment_signal") return 0.2;
    if (input.activeDomain === "timeline" && ["delivery_drift_signal", "timeline_pressure_signal"].includes(nutrient.nutrientType)) return 0.2;
    if (input.activeDomain === "governance" && nutrient.nutrientType === "governance_gap_signal") return 0.2;
    if (input.activeDomain === "stakeholder" && nutrient.nutrientType === "stakeholder_signal") return 0.2;
    if (input.activeDomain === "delivery" && ["blocker_signal", "dependency_signal", "delivery_drift_signal"].includes(nutrient.nutrientType)) return 0.18;
    if (input.activeDomain === "risk" && nutrient.nutrientType === "risk_signal") return 0.18;
    return 0;
  })();
  const weighted = (TYPE_WEIGHT[nutrient.nutrientType] ?? 0.4) * 0.35 + recency * 0.2 + severity * 0.18 + recurrence * 0.14 + input.keywordOverlap * 0.08 + domainBoost * 0.05;
  return Number((Math.max(0, weighted * resolutionFactor) * 100).toFixed(2));
}

export async function retrieveOperationalContinuity(request: OperationalContinuityRequest): Promise<OperationalContinuityResult> {
  const empty: OperationalContinuityResult = { retrievedAt: new Date().toISOString(), status: "empty", continuityScore: 0, continuitySignals: [], unresolvedBlockers: [], escalationSignals: [], recurringPatterns: [], stakeholderPressureSignals: [], suggestedAttentionAreas: [], continuitySummary: [], boundedEvidence: [] };
  try {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();
    let query = supabase.from("vault_nutrients").select("id,nutrient_type,summary,evidence,scoring,created_at,project_id,workspace_id").eq("workspace_id", request.workspaceId).order("created_at", { ascending: false }).limit(Math.max(1, Math.min(request.maxNutrients ?? DEFAULT_MAX_NUTRIENTS, 120)));
    if (request.projectId) query = query.eq("project_id", request.projectId);
    const { data, error } = await query;
    if (error) return { ...empty, status: "degraded", degradationReason: `vault_query_failed:${error.message}` };
    const rows = (data ?? []) as Array<{ id: string; nutrient_type: VaultNutrientType; summary: string; evidence: VaultEvidenceLineage[]; scoring: VaultNutrient["scoring"]; created_at: string; project_id: string | null; workspace_id: string; }>;
    if (!rows.length) return empty;

    const byFingerprint = new Map<string, VaultNutrient[]>();
    for (const row of rows) {
      const nutrient: VaultNutrient = { id: row.id, nutrientType: row.nutrient_type, summary: row.summary ?? "", evidence: Array.isArray(row.evidence) ? row.evidence : [], scoring: row.scoring, entities: [], duplicateMergeCount: 0, workspaceId: row.workspace_id, projectId: row.project_id, digestionRunId: "", createdAt: row.created_at };
      const { excerpt } = excerptFromEvidence(nutrient.evidence);
      const stakeholders = Array.from(new Set((nutrient.evidence ?? []).map((e) => e.actorUserId).filter(Boolean)));
      const fp = `${nutrient.nutrientType}:${normalizeContinuityText(excerpt).slice(0, 96)}:${stakeholders.join(",")}:${nutrient.projectId ?? "none"}`;
      const list = byFingerprint.get(fp) ?? [];
      list.push(nutrient);
      byFingerprint.set(fp, list);
    }

    const signals: ContinuitySignal[] = [];
    for (const group of byFingerprint.values()) {
      const nutrient = group[0];
      const { excerpt, sourceType } = excerptFromEvidence(nutrient.evidence);
      if (!excerpt) continue;
      const recurrenceCount = group.length;
      const unresolved = !resolvedNutrient(nutrient);
      if (!request.includeResolved && !unresolved) continue;
      const overlap = calculateKeywordOverlap(request.currentMessage, `${nutrient.summary} ${excerpt}`);
      const relevanceScore = scoreContinuityCandidate({ nutrient, recurrenceCount, keywordOverlap: overlap, activeDomain: request.activeDomain ?? "general", includeResolved: request.includeResolved ?? false });
      signals.push({ nutrientId: nutrient.id, type: nutrient.nutrientType, relevanceScore, urgency: classifyContinuityUrgency({ unresolved, nutrientType: nutrient.nutrientType, recurrenceCount, createdAt: nutrient.createdAt }), continuityReason: `type=${nutrient.nutrientType}; unresolved=${unresolved}; recurrence=${recurrenceCount}; overlap=${overlap.toFixed(2)}`, evidenceExcerpt: excerpt, createdAt: nutrient.createdAt, recurrenceCount, unresolved, stakeholders: [], sourceType });
    }

    const ranked = signals.sort((a, b) => b.relevanceScore - a.relevanceScore || Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.nutrientId.localeCompare(b.nutrientId)).slice(0, MAX_CONTINUITY_SIGNALS);
    if (!ranked.length) return empty;
    return buildContinuityContext(ranked, request.maxEvidence ?? DEFAULT_MAX_EVIDENCE);
  } catch (error) {
    return { ...empty, status: "degraded", degradationReason: error instanceof Error ? error.message : "unknown_retrieval_error" };
  }
}

export function buildContinuityContext(signals: ContinuitySignal[], maxEvidence = DEFAULT_MAX_EVIDENCE): OperationalContinuityResult {
  const unresolvedBlockers = signals.filter((s) => s.unresolved && s.type === "blocker_signal");
  const escalationSignals = signals.filter((s) => s.type === "escalation_signal");
  const recurringPatterns = signals.filter((s) => (s.recurrenceCount ?? 1) > 1);
  const stakeholderPressureSignals = signals.filter((s) => s.type === "stakeholder_signal" || /stakeholder|sponsor|vendor/i.test(s.evidenceExcerpt));
  const boundedEvidence = Array.from(new Set(signals.map((s) => s.evidenceExcerpt.slice(0, MAX_EXCERPT_CHARS)))).slice(0, Math.min(maxEvidence, MAX_EVIDENCE_EXCERPTS));

  const continuitySummary = [
    unresolvedBlockers.length ? `${unresolvedBlockers.length} unresolved blockers remain active.` : "No active unresolved blockers in scope.",
    escalationSignals.length ? `Recent escalation continuity detected (${escalationSignals.length} signals).` : "No recent escalation continuity detected.",
    recurringPatterns.length ? `Recurring operational patterns observed (${recurringPatterns.length} repeated signals).` : "No recurring operational pattern exceeded threshold.",
    signals.some((s) => s.type === "delivery_drift_signal" || s.type === "timeline_pressure_signal") ? "Timeline drift signals appeared in the recent retrieval window." : "Timeline drift signal density is currently low.",
  ].slice(0, MAX_SUMMARY_ITEMS);

  const suggestedAttentionAreas = Array.from(new Set(signals.filter((s) => s.urgency === "critical" || s.urgency === "high").map((s) => s.type.replaceAll("_signal", "").replaceAll("_", " ")))).slice(0, MAX_SUMMARY_ITEMS);
  const continuityScore = Number((signals.reduce((acc, s) => acc + s.relevanceScore, 0) / Math.max(1, signals.length)).toFixed(2));

  return { retrievedAt: new Date().toISOString(), status: signals.length ? "ok" : "empty", continuityScore, continuitySignals: signals.slice(0, MAX_CONTINUITY_SIGNALS), unresolvedBlockers, escalationSignals, recurringPatterns, stakeholderPressureSignals, suggestedAttentionAreas, continuitySummary, boundedEvidence };
}

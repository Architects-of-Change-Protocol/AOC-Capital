import crypto from "node:crypto";
import type { RuntimeConversationState } from "@/lib/runtime-conversation-state";
import { persistDigestionResult } from "@/lib/vault/digestive/persistence";
import { scoreNutrient } from "@/lib/vault/digestive/scoring";
import type {
  VaultDigestionResult,
  VaultEvidenceLineage,
  VaultExtractedEntity,
  VaultNutrient,
  VaultNutrientType,
  VaultRawMaterial,
  VaultSemanticResidue,
} from "@/lib/vault/digestive/types";

const MAX_EXCERPT = 240;
const MIN_MEANINGFUL_WORDS = 8;

export type ConversationVaultIngestionInput = {
  companyId: string;
  workspaceId: string | null;
  projectId: string | null;
  sessionKey: string;
  activeDomain: string;
  message: string;
  runtimeResponse?: {
    observation?: string;
    interpretation?: string;
    supportingEvidence?: string[];
    confidence?: string;
    suggestedActions?: string[];
    followUps?: string[];
    trustNotes?: string[];
  };
  conversationState?: RuntimeConversationState | null;
  sourceRef?: string;
  actorUserId?: string | null;
};

export type ConversationSignalCandidate = {
  nutrientType: VaultNutrientType;
  excerpt: string;
  matchedPattern: string;
  sourceField: string;
  confidence: number;
};

export type ConversationVaultIngestionResult = {
  status: "skipped" | "ingested" | "failed";
  reason?: string;
  digestionRunId?: string;
  nutrientsCreated: number;
  residueCreated: number;
  nutrientTypes: string[];
  signalCount: number;
  evidenceRefs: string[];
};

const GENERIC_PATTERNS = [/^thanks!?$/i, /^ok(?:ay)?$/i, /^what next\??$/i, /^sounds good$/i];

const SIGNAL_RULES: Array<{ nutrientType: VaultNutrientType; patterns: RegExp[] }> = [
  { nutrientType: "blocker_signal", patterns: [/\bblocked\b/i, /\bblocker\b/i, /\bimpediment\b/i, /\bstuck\b/i, /\bcannot proceed\b/i, /\bwaiting on\b/i, /\bpending access\b/i] },
  { nutrientType: "risk_signal", patterns: [/\brisk\b/i, /\bat risk\b/i, /\blikely to slip\b/i, /\bexposure\b/i, /\bthreat\b/i] },
  { nutrientType: "dependency_signal", patterns: [/\bdependency\b/i, /\bdepends on\b/i, /\bwaiting for\b/i, /\brequires input\b/i, /\bhandoff\b/i, /\bupstream\b/i, /\bdownstream\b/i] },
  { nutrientType: "decision_signal", patterns: [/\bdecision\b/i, /\bapprove\b/i, /\bchoose\b/i, /\bsign off\b/i, /\bauthorize\b/i, /\bconfirm\b/i] },
  { nutrientType: "stakeholder_signal", patterns: [/\bsponsor\b/i, /\bclient\b/i, /\bstakeholder\b/i, /\bowner\b/i, /\bexecutive\b/i, /\bvendor\b/i] },
  { nutrientType: "escalation_signal", patterns: [/\bescalat/i, /\bsponsor update\b/i, /\bsteering committee\b/i, /\bexecutive attention\b/i] },
  { nutrientType: "commitment_signal", patterns: [/\bwill do\b/i, /\bcommitted\b/i, /\bdue date\b/i, /\bowner assigned\b/i, /\baction by\b/i, /\bnext step\b/i] },
  { nutrientType: "recovery_signal", patterns: [/\bresolved\b/i, /\bunblocked\b/i, /\bstabilized\b/i, /\bcompleted\b/i, /\bclosed\b/i, /\brecovered\b/i] },
  { nutrientType: "ambiguity_signal", patterns: [/\bunclear\b/i, /\bunknown\b/i, /\bambiguous\b/i, /\bnot defined\b/i, /\bmissing owner\b/i, /\bunclear scope\b/i] },
  { nutrientType: "timeline_pressure_signal", patterns: [/\btoday\b/i, /\btomorrow\b/i, /\bthis week\b/i, /\bdeadline\b/i, /\boverdue\b/i, /\burgent\b/i, /\bnext 24h\b/i] },
  { nutrientType: "financial_impediment_signal", patterns: [/\bpayment\b/i, /\bpo\b/i, /\binvoice\b/i, /\bbudget\b/i, /\bbilling\b/i, /\bpurchase order\b/i] },
  { nutrientType: "governance_gap_signal", patterns: [/\bno owner\b/i, /\bmissing approval\b/i, /\bno decision\b/i, /\bgovernance\b/i, /\bapproval pending\b/i] },
  { nutrientType: "delivery_drift_signal", patterns: [/\bslipping\b/i, /\bdelayed\b/i, /\bdrift\b/i, /\bbehind schedule\b/i, /\bschedule moved\b/i] },
  { nutrientType: "contradiction_signal", patterns: [/\bconflicting\b/i, /\bcontradiction\b/i, /\bmismatch\b/i, /\binconsistent\b/i, /\bdifferent versions\b/i] },
];

const meaningfulWordCount = (text: string) => text.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w) && w.length > 2).length;

export const shouldIngestConversationSignal = (candidate: ConversationSignalCandidate): boolean =>
  candidate.excerpt.trim().length >= 16 && candidate.confidence >= 0.6;

export function extractConversationSignals(input: ConversationVaultIngestionInput): ConversationSignalCandidate[] {
  const sources: Array<{ field: string; text: string }> = [
    { field: "message", text: input.message },
    { field: "runtime.observation", text: input.runtimeResponse?.observation ?? "" },
    { field: "runtime.interpretation", text: input.runtimeResponse?.interpretation ?? "" },
    ...(input.runtimeResponse?.supportingEvidence ?? []).map((text) => ({ field: "runtime.supportingEvidence", text })),
    ...(input.runtimeResponse?.suggestedActions ?? []).map((text) => ({ field: "runtime.suggestedActions", text })),
    ...(input.conversationState?.recentBlockers ?? []).map((text) => ({ field: "state.recentBlockers", text })),
    ...(input.conversationState?.recentInterventions ?? []).map((text) => ({ field: "state.recentInterventions", text })),
    ...(input.conversationState?.recentStakeholders ?? []).map((text) => ({ field: "state.recentStakeholders", text })),
    ...(input.conversationState?.recentEvidence ?? []).map((text) => ({ field: "state.recentEvidence", text })),
  ];

  const out: ConversationSignalCandidate[] = [];
  for (const source of sources) {
    const line = source.text.trim();
    if (!line) continue;
    for (const rule of SIGNAL_RULES) {
      const matched = rule.patterns.find((p) => p.test(line));
      if (!matched) continue;
      out.push({ nutrientType: rule.nutrientType, excerpt: line.slice(0, MAX_EXCERPT), matchedPattern: matched.toString(), sourceField: source.field, confidence: 0.7 });
    }
  }
  return out;
}

export function mapConversationSignalsToNutrients(input: {
  candidates: ConversationSignalCandidate[];
  workspaceId: string;
  projectId: string | null;
  digestionRunId: string;
  createdAt: string;
  sourceArtifactId: string;
  sourceRef: string;
  actorUserId: string | null;
}): VaultNutrient[] {
  return input.candidates.filter(shouldIngestConversationSignal).map((candidate) => {
    const evidence: VaultEvidenceLineage = {
      sourceArtifactId: input.sourceArtifactId,
      sourceType: "operational_update",
      sourceTitle: "Copilot Conversation",
      excerpt: candidate.excerpt.slice(0, MAX_EXCERPT),
      timestamp: input.createdAt,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      actorUserId: input.actorUserId,
      confidenceBasis: `Deterministic conversation rule match ${candidate.matchedPattern} from ${candidate.sourceField} (${input.sourceRef}).`,
      extractionMethod: "rule_based",
    };
    return {
      id: crypto.randomUUID(),
      nutrientType: candidate.nutrientType,
      summary: `Conversation signal: ${candidate.nutrientType.replaceAll("_", " ")} detected from ${candidate.sourceField}.`,
      entities: [] as VaultExtractedEntity[],
      evidence: [evidence],
      scoring: scoreNutrient({ nutrientType: candidate.nutrientType, confidence: candidate.confidence }),
      duplicateMergeCount: 0,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      digestionRunId: input.digestionRunId,
      createdAt: input.createdAt,
    };
  });
}

export async function ingestConversationIntoVault(
  input: ConversationVaultIngestionInput,
): Promise<ConversationVaultIngestionResult> {
  if (meaningfulWordCount(input.message) < MIN_MEANINGFUL_WORDS) return { status: "skipped", reason: "message_too_short", nutrientsCreated: 0, residueCreated: 0, nutrientTypes: [], signalCount: 0, evidenceRefs: [] };
  if (GENERIC_PATTERNS.some((pattern) => pattern.test(input.message.trim()))) return { status: "skipped", reason: "no_operational_signal", nutrientsCreated: 0, residueCreated: 0, nutrientTypes: [], signalCount: 0, evidenceRefs: [] };
  if (!input.runtimeResponse?.supportingEvidence?.length && !input.runtimeResponse?.suggestedActions?.length) return { status: "skipped", reason: "low_evidence_density", nutrientsCreated: 0, residueCreated: 0, nutrientTypes: [], signalCount: 0, evidenceRefs: [] };
  if (!input.workspaceId) return { status: "skipped", reason: "missing_project_scope", nutrientsCreated: 0, residueCreated: 0, nutrientTypes: [], signalCount: 0, evidenceRefs: [] };

  const candidates = extractConversationSignals(input);
  if (!candidates.length) return { status: "skipped", reason: "no_operational_signal", nutrientsCreated: 0, residueCreated: 0, nutrientTypes: [], signalCount: 0, evidenceRefs: [] };

  const deduped: ConversationSignalCandidate[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const key = `${candidate.nutrientType}:${candidate.excerpt.toLowerCase()}:${input.projectId ?? "none"}:${input.sessionKey}`;
    if (seen.has(key)) continue;
    if (input.conversationState?.recentEvidence?.some((item) => item.toLowerCase().includes(candidate.excerpt.toLowerCase().slice(0, 64)))) continue;
    seen.add(key);
    deduped.push(candidate);
  }

  if (!deduped.length) return { status: "skipped", reason: "duplicate_recent_signal", nutrientsCreated: 0, residueCreated: 0, nutrientTypes: [], signalCount: candidates.length, evidenceRefs: [] };

  const digestionRunId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const sourceRef = input.sourceRef ?? `copilot:${input.sessionKey}:${createdAt}`;
  const mapped = mapConversationSignalsToNutrients({
    candidates: deduped,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    digestionRunId,
    createdAt,
    sourceArtifactId: sourceRef,
    sourceRef,
    actorUserId: input.actorUserId ?? null,
  });

  const digestionResult: VaultDigestionResult = {
    digestivePass: {
      runId: digestionRunId,
      rawMaterialId: sourceRef,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      actorUserId: input.actorUserId ?? null,
      startedAt: createdAt,
      completedAt: createdAt,
      extractionMethod: "rule_based",
      nutrientCount: mapped.length,
      residueCount: 0,
      entityCount: 0,
      suppressedCandidateCount: candidates.length - mapped.length,
    },
    nutrients: mapped,
    residue: [] as VaultSemanticResidue[],
    entities: [] as VaultExtractedEntity[],
  };

  try {
    await persistDigestionResult(digestionResult);
    return { status: "ingested", digestionRunId, nutrientsCreated: mapped.length, residueCreated: 0, nutrientTypes: Array.from(new Set(mapped.map((m) => m.nutrientType))), signalCount: deduped.length, evidenceRefs: mapped.flatMap((m) => m.evidence.map((e) => e.sourceArtifactId ?? "")).filter(Boolean) };
  } catch {
    return { status: "failed", reason: "persistence_failure", digestionRunId, nutrientsCreated: 0, residueCreated: 0, nutrientTypes: [], signalCount: deduped.length, evidenceRefs: [] };
  }
}

export type { VaultNutrient };
export type ConversationSignalIngestion = ConversationVaultIngestionInput;

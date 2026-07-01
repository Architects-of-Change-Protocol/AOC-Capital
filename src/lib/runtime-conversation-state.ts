import { createSupabaseServerClient } from "@/lib/supabase/server";

export const MAX_RECENT_QUESTIONS = 8;
export const MAX_RECENT_ENTITIES = 16;
export const MAX_RECENT_BLOCKERS = 12;
export const MAX_RECENT_INTERVENTIONS = 12;
export const MAX_RECENT_STAKEHOLDERS = 12;
export const MAX_RECENT_EVIDENCE = 16;
export const DEFAULT_TTL_DAYS = 14;
const PREVIEW_MAX = 240;
const STATE_VERSION = "runtime-conversation-state.v1";

export type RuntimeConversationScope = {
  companyId: string;
  workspaceId?: string | null;
  projectId?: string | null;
  sessionKey: string;
};

export type RuntimeTrustState = {
  evidenceDensity: "none" | "low" | "medium" | "high";
  continuityStatus: "new" | "active" | "stale" | "expired";
  lastUpdatedReason?: string;
};

export type RuntimeConversationState = RuntimeConversationScope & {
  activeDomain: string | null;
  recentQuestions: string[];
  recentEntities: string[];
  recentBlockers: string[];
  recentInterventions: string[];
  recentStakeholders: string[];
  recentEvidence: string[];
  messageCount: number;
  expiresAt: string;
  lastSeenAt: string;
  trustState?: RuntimeTrustState;
};

export type RuntimeConversationUpdateInput = RuntimeConversationScope & {
  activeDomain?: string;
  message: string;
  evidenceRefs?: string[];
  extractedEntities?: string[];
  extractedBlockers?: string[];
  extractedInterventions?: string[];
  extractedStakeholders?: string[];
};

type RuntimeConversationRow = {
  company_id: string;
  workspace_id: string | null;
  project_id: string | null;
  session_key: string;
  active_domain: string | null;
  state: Record<string, unknown>;
  recent_questions: string[];
  recent_entities: string[];
  recent_blockers: string[];
  recent_interventions: string[];
  recent_stakeholders: string[];
  recent_evidence: string[];
  message_count: number;
  expires_at: string;
  last_seen_at: string;
};

const normalizeValues = (items: string[], max: number): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
};

export const computeEvidenceDensity = (evidenceCount: number): RuntimeTrustState["evidenceDensity"] => {
  if (evidenceCount <= 0) return "none";
  if (evidenceCount <= 3) return "low";
  if (evidenceCount <= 8) return "medium";
  return "high";
};

const pickMatches = (text: string, patterns: RegExp[]) => {
  const matches = new Set<string>();
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[0]?.trim();
      if (value) matches.add(value);
    }
  }
  return Array.from(matches);
};

const extractFromMessage = (message: string) => {
  const text = message.toLowerCase();
  return {
    entities: pickMatches(text, [/\b(blocker|dependency|risk|stakeholder|escalation|governance|intervention|timeline|owner(ship)?)\b/g]),
    blockers: pickMatches(text, [/\bblocker[s]?\b/g, /\bunresolved\b/g]),
    interventions: pickMatches(text, [/\bintervention[s]?\b/g, /\brecovery\b/g, /\bescalation\b/g]),
    stakeholders: pickMatches(text, [/\bstakeholder[s]?\b/g, /\bsponsor[s]?\b/g, /\bexecutive[s]?\b/g]),
  };
};

const emptyState = (scope: RuntimeConversationScope, status: RuntimeTrustState["continuityStatus"] = "new"): RuntimeConversationState => {
  const now = new Date();
  const expires = new Date(now.getTime() + DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000);
  return {
    ...scope,
    workspaceId: scope.workspaceId ?? null,
    projectId: scope.projectId ?? null,
    activeDomain: "operational_memory",
    recentQuestions: [],
    recentEntities: [],
    recentBlockers: [],
    recentInterventions: [],
    recentStakeholders: [],
    recentEvidence: [],
    messageCount: 0,
    expiresAt: expires.toISOString(),
    lastSeenAt: now.toISOString(),
    trustState: { evidenceDensity: "none", continuityStatus: status },
  };
};

const fromRow = (row: RuntimeConversationRow): RuntimeConversationState => {
  const now = Date.now();
  const expired = Date.parse(row.expires_at) <= now;
  const continuityStatus: RuntimeTrustState["continuityStatus"] = expired ? "expired" : row.message_count > 0 ? "active" : "new";
  if (expired) {
    return { ...emptyState({ companyId: row.company_id, workspaceId: row.workspace_id, projectId: row.project_id, sessionKey: row.session_key }, "expired"), activeDomain: row.active_domain ?? "operational_memory" };
  }
  return {
    companyId: row.company_id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    sessionKey: row.session_key,
    activeDomain: row.active_domain,
    recentQuestions: Array.isArray(row.recent_questions) ? row.recent_questions : [],
    recentEntities: Array.isArray(row.recent_entities) ? row.recent_entities : [],
    recentBlockers: Array.isArray(row.recent_blockers) ? row.recent_blockers : [],
    recentInterventions: Array.isArray(row.recent_interventions) ? row.recent_interventions : [],
    recentStakeholders: Array.isArray(row.recent_stakeholders) ? row.recent_stakeholders : [],
    recentEvidence: Array.isArray(row.recent_evidence) ? row.recent_evidence : [],
    messageCount: row.message_count ?? 0,
    expiresAt: row.expires_at,
    lastSeenAt: row.last_seen_at,
    trustState: {
      evidenceDensity: computeEvidenceDensity(Array.isArray(row.recent_evidence) ? row.recent_evidence.length : 0),
      continuityStatus,
      lastUpdatedReason: typeof row.state?.lastUpdateReason === "string" ? row.state.lastUpdateReason : undefined,
    },
  };
};

export const buildMergedState = (previous: RuntimeConversationState | null, input: RuntimeConversationUpdateInput): RuntimeConversationState => {
  const base = previous ?? emptyState(input);
  const now = new Date();
  const expired = Date.parse(base.expiresAt) <= now.getTime();
  const start = expired ? emptyState(input, "stale") : base;
  const extracted = extractFromMessage(input.message);
  const entities = input.extractedEntities?.length ? input.extractedEntities : extracted.entities;
  const blockers = input.extractedBlockers?.length ? input.extractedBlockers : extracted.blockers;
  const interventions = input.extractedInterventions?.length ? input.extractedInterventions : extracted.interventions;
  const stakeholders = input.extractedStakeholders?.length ? input.extractedStakeholders : extracted.stakeholders;
  return {
    ...start,
    companyId: input.companyId,
    workspaceId: input.workspaceId ?? null,
    projectId: input.projectId ?? null,
    sessionKey: input.sessionKey,
    activeDomain: input.activeDomain ?? start.activeDomain ?? "operational_memory",
    recentQuestions: normalizeValues([input.message, ...start.recentQuestions], MAX_RECENT_QUESTIONS),
    recentEntities: normalizeValues([...(entities ?? []), ...start.recentEntities], MAX_RECENT_ENTITIES),
    recentBlockers: normalizeValues([...(blockers ?? []), ...start.recentBlockers], MAX_RECENT_BLOCKERS),
    recentInterventions: normalizeValues([...(interventions ?? []), ...start.recentInterventions], MAX_RECENT_INTERVENTIONS),
    recentStakeholders: normalizeValues([...(stakeholders ?? []), ...start.recentStakeholders], MAX_RECENT_STAKEHOLDERS),
    recentEvidence: normalizeValues([...(input.evidenceRefs ?? []), ...start.recentEvidence], MAX_RECENT_EVIDENCE),
    messageCount: start.messageCount + 1,
    lastSeenAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    trustState: {
      evidenceDensity: computeEvidenceDensity((input.evidenceRefs ?? []).length || start.recentEvidence.length),
      continuityStatus: expired ? "stale" : previous ? "active" : "new",
      lastUpdatedReason: "copilot_message",
    },
  };
};

const buildAuditState = (state: RuntimeConversationState, input: RuntimeConversationUpdateInput) => ({
  version: STATE_VERSION,
  lastUpdateReason: "copilot_message",
  lastActiveDomain: state.activeDomain,
  lastEvidenceRefs: (input.evidenceRefs ?? []).slice(0, MAX_RECENT_EVIDENCE),
  lastMessagePreview: input.message.trim().slice(0, PREVIEW_MAX),
  updatedBy: "copilot",
});

export async function loadPersistentRuntimeConversationState(scope: RuntimeConversationScope): Promise<RuntimeConversationState | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("runtime_conversation_state").select("*").eq("company_id", scope.companyId).eq("workspace_id", scope.workspaceId ?? null).eq("project_id", scope.projectId ?? null).eq("session_key", scope.sessionKey).maybeSingle();
  if (error) throw new Error(`Unable to load runtime conversation state: ${error.message}`);
  if (!data) return null;
  return fromRow(data as RuntimeConversationRow);
}

export async function updatePersistentRuntimeConversationState(input: RuntimeConversationUpdateInput): Promise<RuntimeConversationState> {
  const previous = await loadPersistentRuntimeConversationState(input);
  const next = buildMergedState(previous, input);
  const supabase = await createSupabaseServerClient();
  const payload = {
    company_id: next.companyId,
    workspace_id: next.workspaceId,
    project_id: next.projectId,
    session_key: next.sessionKey,
    active_domain: next.activeDomain,
    state: buildAuditState(next, input),
    recent_questions: next.recentQuestions,
    recent_entities: next.recentEntities,
    recent_blockers: next.recentBlockers,
    recent_interventions: next.recentInterventions,
    recent_stakeholders: next.recentStakeholders,
    recent_evidence: next.recentEvidence,
    message_count: next.messageCount,
    expires_at: next.expiresAt,
    last_seen_at: next.lastSeenAt,
    updated_at: new Date().toISOString(),
  };
  let error: { message: string } | null = null;
  if (previous) {
    const updated = await supabase.from("runtime_conversation_state").update(payload).eq("company_id", next.companyId).eq("workspace_id", next.workspaceId).eq("project_id", next.projectId).eq("session_key", next.sessionKey);
    error = updated.error;
  } else {
    const inserted = await supabase.from("runtime_conversation_state").insert(payload);
    error = inserted.error;
  }
  if (error) throw new Error(`Unable to update runtime conversation state: ${error.message}`);
  return next;
}

export async function loadRuntimeConversationState(scope: RuntimeConversationScope): Promise<RuntimeConversationState | null> {
  return loadPersistentRuntimeConversationState(scope);
}

export async function updateRuntimeConversationState(input: RuntimeConversationUpdateInput): Promise<RuntimeConversationState> {
  return updatePersistentRuntimeConversationState(input);
}

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireWorkspaceRole } from "@/lib/security/access-guards";
import { type Permission } from "@/lib/security/rbac";
import { ensurePmfreakAocAdaptersRegistered } from "@/lib/aoc/bootstrap";
import { authorizeRuntimeAction, buildEnterpriseRuntimeRequest } from "@/aoc/runtime-consumer";
import { getAuthUser } from "@/lib/auth";
import { PERMISSION_TO_GOVERNANCE_ACTION } from "@/lib/aoc/runtime/governance-actions";

export type AgentAccessDecision = "allow" | "deny" | "require_approval" | "expired" | "revoked" | "no_scope";

// Canonical mapping lives in governance-actions.ts; use it directly.
const GOVERNANCE_ACTION_BY_PERMISSION = PERMISSION_TO_GOVERNANCE_ACTION;

export async function evaluateAgentAccess(input: { workspaceId: string; agentId: string; resourceType: "workspace" | "project" | "operational_memory" | "governance_object" | "ai_coprocess" | "copilot"; resourceId: string; permission: Permission; }) {
  ensurePmfreakAocAdaptersRegistered();
  const supabase = await createSupabaseServerClient();
  const { data: agent } = await supabase.from("ai_agents").select("id,workspace_id,name,status,risk_level").eq("id", input.agentId).eq("workspace_id", input.workspaceId).maybeSingle();
  if (!agent) return { decision: "deny" as AgentAccessDecision, reason: "agent_not_found" };
  if (agent.status === "revoked") return { decision: "revoked" as AgentAccessDecision, reason: "agent_revoked", agent };
  if (agent.status !== "active") return { decision: "deny" as AgentAccessDecision, reason: "agent_disabled", agent };

  const { data: scopes } = await supabase.from("ai_agent_scopes").select("id,status,expires_at,permission,resource_type,resource_id,scope,granted_by_user_id,capability_grant_id").eq("workspace_id", input.workspaceId).eq("agent_id", input.agentId).eq("status", "active");
  const nowIso = new Date().toISOString();
  const matched = (scopes ?? []).find((s) => s.permission === input.permission && s.resource_type === input.resourceType && s.resource_id === input.resourceId);
  if (!matched) return { decision: "no_scope" as AgentAccessDecision, reason: "scope_missing", agent };
  if (matched.expires_at && matched.expires_at <= nowIso) {
    await supabase.from("ai_agent_scopes").update({ status: "expired", updated_at: nowIso }).eq("id", matched.id);
    return { decision: "expired" as AgentAccessDecision, reason: "scope_expired", agent, scope: matched };
  }

  const user = await getAuthUser();
  if (!user) return { decision: "deny" as AgentAccessDecision, reason: "unauthorized", agent, scope: matched };
  const runtimeDecision = await authorizeRuntimeAction(buildEnterpriseRuntimeRequest({
    user,
    action: GOVERNANCE_ACTION_BY_PERMISSION[input.permission],
    routeId: "evaluateAgentAccess",
    workspaceId: input.workspaceId,
    projectId: input.resourceType === "project" ? input.resourceId : null,
    resourceType: input.resourceType === "copilot" ? "ai_coprocess" : input.resourceType,
    resourceId: input.resourceId,
    actorAgentId: input.agentId,
    metadata: { requestedPermission: input.permission, scopeId: matched.id },
  }));
  const decision: AgentAccessDecision = runtimeDecision.allowed ? "allow" : runtimeDecision.reason === "expired" ? "expired" : "deny";

  await supabase.from("capability_audit_events").insert({ workspace_id: input.workspaceId, actor_agent_id: input.agentId, grant_id: matched.capability_grant_id ?? null, event_type: decision === "allow" ? "agent_access_allowed" : "agent_access_denied", event_detail: { decision, reason: runtimeDecision.reason, resourceType: input.resourceType, resourceId: input.resourceId, permission: input.permission, scopeId: matched.id, grantedByUserId: matched.granted_by_user_id, runtimeDecisionId: runtimeDecision.decisionId } });
  await supabase.from("capability_audit_events").insert({ workspace_id: input.workspaceId, actor_agent_id: input.agentId, grant_id: matched.capability_grant_id ?? null, event_type: "agent_policy_evaluated", event_detail: { decision: runtimeDecision.allowed ? "allow" : "deny", reason: runtimeDecision.reason, resourceType: input.resourceType, resourceId: input.resourceId, permission: input.permission, runtimeDecisionId: runtimeDecision.decisionId } });
  await supabase.from("ai_agents").update({ last_seen_at: nowIso, last_action_at: nowIso, updated_at: nowIso }).eq("id", input.agentId);

  return { decision, reason: runtimeDecision.reason, agent, scope: matched, policyDecision: runtimeDecision.allowed ? "allow" : "deny" };
}

export async function requireAgentScope(input: Parameters<typeof evaluateAgentAccess>[0]) {
  const result = await evaluateAgentAccess(input);
  if (result.decision !== "allow") throw new Error(`agent_access_${result.decision}`);
  return result;
}

export async function grantAgentScope(input: { workspaceId: string; agentId: string; resourceType: "workspace" | "project" | "operational_memory" | "governance_object" | "ai_coprocess" | "copilot"; resourceId: string; permission: Permission; expiresAt?: string | null; grantedByUserId: string; }) {
  await requireWorkspaceRole(input.workspaceId, ["owner", "admin"]);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("ai_agent_scopes").insert({ workspace_id: input.workspaceId, agent_id: input.agentId, resource_type: input.resourceType, resource_id: input.resourceId, permission: input.permission, expires_at: input.expiresAt ?? null, granted_by_user_id: input.grantedByUserId, scope: { workspaceId: input.workspaceId, resourceId: input.resourceId, permission: input.permission } }).select("id").single();
  await supabase.from("capability_audit_events").insert({ workspace_id: input.workspaceId, actor_user_id: input.grantedByUserId, actor_agent_id: input.agentId, event_type: "agent_scope_granted", event_detail: { scopeId: data?.id ?? null, resourceType: input.resourceType, resourceId: input.resourceId, permission: input.permission, expiresAt: input.expiresAt ?? null } });
}

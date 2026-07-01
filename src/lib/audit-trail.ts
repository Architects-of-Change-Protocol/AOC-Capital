import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/auth";

export type AuditVisibility = "user" | "admin";

export type NormalizedAuditItem = {
  id: string;
  workspace_id: string;
  timestamp: string;
  actor_type: string;
  actor_id: string | null;
  actor_display: string;
  action: string;
  action_label: string;
  resource_type: string;
  resource_id: string | null;
  resource_label: string;
  decision: string | null;
  decision_label: string;
  status: string;
  severity: "low" | "medium" | "high";
  reason: string | null;
  policy_trace: string[];
  capability_request_id: string | null;
  capability_grant_id: string | null;
  approval_chain: string[];
  metadata_summary: string[];
  technical_details?: Record<string, unknown>;
};

const shortId = (id?: string | null) => (id ? `${id.slice(0, 8)}…` : "unknown");
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());

function buildPolicyTrace(detail: Record<string, unknown>): string[] {
  const out: string[] = [];
  if (typeof detail.reason === "string") out.push(`Reason: ${label(detail.reason)}.`);
  if (Array.isArray(detail.matchedPolicyIds) && detail.matchedPolicyIds.length) out.push(`Matched policies: ${detail.matchedPolicyIds.join(", ")}.`);
  if (typeof detail.matchedGrantId === "string") out.push(`Matched grant: ${shortId(detail.matchedGrantId)}.`);
  if (typeof detail.scopeResult === "string") out.push(`Scope validation: ${label(detail.scopeResult)}.`);
  if (typeof detail.expirationResult === "string") out.push(`Expiration validation: ${label(detail.expirationResult)}.`);
  return out;
}

function normalizeCapabilityEvent(event: Record<string, unknown>, visibility: AuditVisibility): NormalizedAuditItem {
  const detail = (event.event_detail ?? {}) as Record<string, unknown>;
  const eventType = typeof event.event_type === "string" ? event.event_type : "unknown";
  const workspaceId = typeof event.workspace_id === "string" ? event.workspace_id : "unknown";
  const decision = typeof detail.decision === "string" ? detail.decision : eventType.includes("denied") ? "deny" : eventType.includes("approved") ? "allow" : null;
  const reason = typeof detail.reason === "string" ? detail.reason : typeof detail.policyReason === "string" ? detail.policyReason : null;
  const policyTrace = buildPolicyTrace(detail);
  const requestId = typeof event.request_id === "string" ? event.request_id : null;
  const grantId = typeof event.grant_id === "string" ? event.grant_id : null;
  return {
    id: String(event.id),
    workspace_id: workspaceId,
    timestamp: String(event.created_at),
    actor_type: typeof event.actor_user_id === "string" ? "user" : typeof event.actor_agent_id === "string" ? "ai_agent" : "system",
    actor_id: typeof event.actor_user_id === "string" ? event.actor_user_id : typeof event.actor_agent_id === "string" ? event.actor_agent_id : null,
    actor_display: typeof event.actor_user_id === "string" ? `User ${shortId(event.actor_user_id)}` : typeof event.actor_agent_id === "string" ? `AI Agent ${shortId(event.actor_agent_id)}` : "System",
    action: eventType,
    action_label: label(eventType),
    resource_type: (detail.resourceType as string) ?? (detail.targetResourceType as string) ?? "capability",
    resource_id: (detail.resourceId as string) ?? (detail.targetResourceId as string) ?? null,
    resource_label: `${label(((detail.resourceType as string) ?? (detail.targetResourceType as string) ?? "resource"))} ${(detail.resourceId as string) ? shortId(detail.resourceId as string) : ""}`.trim(),
    decision,
    decision_label: decision ? label(decision) : "N/A",
    status: detail.status as string ?? "recorded",
    severity: decision === "deny" ? "high" : "medium",
    reason,
    policy_trace: policyTrace,
    capability_request_id: requestId,
    capability_grant_id: grantId,
    approval_chain: [requestId ? `Request ${shortId(requestId)}` : "", grantId ? `Grant ${shortId(grantId)}` : ""].filter(Boolean),
    metadata_summary: [reason ? `Reason: ${label(reason)}` : null, typeof detail.permission === "string" ? `Permission: ${detail.permission}` : null].filter(Boolean) as string[],
    technical_details: visibility === "admin" ? detail : undefined,
  };
}

function normalizeWorkspaceEvent(event: Record<string, unknown>, visibility: AuditVisibility): NormalizedAuditItem {
  const detail = (event.payload ?? {}) as Record<string, unknown>;
  const eventType = typeof event.event_type === "string" ? event.event_type : "workspace_event";
  const workspaceId = typeof event.workspace_id === "string" ? event.workspace_id : "unknown";
  return {
    id: String(event.id),
    workspace_id: workspaceId,
    timestamp: String(event.created_at),
    actor_type: typeof event.actor_user_id === "string" ? "user" : typeof event.actor_agent_id === "string" ? "ai_agent" : "system",
    actor_id: typeof event.actor_user_id === "string" ? event.actor_user_id : typeof event.actor_agent_id === "string" ? event.actor_agent_id : null,
    actor_display: typeof event.actor_user_id === "string" ? `User ${shortId(event.actor_user_id)}` : typeof event.actor_agent_id === "string" ? `AI Agent ${shortId(event.actor_agent_id)}` : "System",
    action: eventType,
    action_label: label(eventType),
    resource_type: "workspace",
    resource_id: workspaceId,
    resource_label: `Workspace ${shortId(workspaceId)}`,
    decision: null,
    decision_label: "N/A",
    status: "recorded",
    severity: "low",
    reason: null,
    policy_trace: [],
    capability_request_id: null,
    capability_grant_id: null,
    approval_chain: [],
    metadata_summary: Object.keys(detail).slice(0, 3).map((k) => `${label(k)} recorded`),
    technical_details: visibility === "admin" ? detail : undefined,
  };
}

export async function getWorkspaceAuditTimeline(workspaceId: string) {
  const user = await requireAuthUser();
  const supabase = await createSupabaseServerClient();
  const { data: membership } = await supabase.from("workspace_memberships").select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle<{ role: string }>();
  if (!membership) throw new Error("Forbidden");
  const visibility: AuditVisibility = membership.role === "owner" || membership.role === "admin" ? "admin" : "user";

  const [capability, workspace, security] = await Promise.all([
    supabase.from("capability_audit_events").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(300),
    supabase.from("workspace_audit_events").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(200),
    visibility === "admin" ? supabase.from("security_events").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(200) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const normalized = [
    ...(capability.data ?? []).map((e) => normalizeCapabilityEvent(e, visibility)),
    ...(workspace.data ?? []).map((e) => normalizeWorkspaceEvent(e, visibility)),
    ...((security.data ?? []).map((e: Record<string, unknown>): NormalizedAuditItem => {
      const actorUserId = typeof e.actor_user_id === "string" ? e.actor_user_id : null;
      const actorAgentId = typeof e.actor_agent_id === "string" ? e.actor_agent_id : null;
      const eventType = typeof e.event_type === "string" ? e.event_type : "security_event";
      const resourceType = typeof e.resource_type === "string" ? e.resource_type : "security";
      const resourceId = typeof e.resource_id === "string" ? e.resource_id : null;
      const denied = typeof e.denied_permission === "string" && e.denied_permission.length > 0;
      return {
        id: String(e.id), workspace_id: workspaceId, timestamp: String(e.created_at), actor_type: actorUserId ? "user" : actorAgentId ? "ai_agent" : "system", actor_id: actorUserId ?? actorAgentId,
        actor_display: actorUserId ? `User ${shortId(actorUserId)}` : actorAgentId ? `AI Agent ${shortId(actorAgentId)}` : "System",
        action: eventType, action_label: label(eventType), resource_type: resourceType, resource_id: resourceId, resource_label: `${label(resourceType)} ${resourceId ? shortId(resourceId) : ""}`.trim(),
        decision: denied ? "deny" : "allow", decision_label: denied ? "Denied" : "Allowed", status: "recorded", severity: denied ? "high" : "medium",
        reason: denied ? "server_authorization_denied" : null, policy_trace: [], capability_request_id: null, capability_grant_id: null, approval_chain: [], metadata_summary: [typeof e.route_id === "string" ? `Route: ${e.route_id}` : ""].filter(Boolean), technical_details: visibility === "admin" ? (e.metadata as Record<string, unknown> | undefined) : undefined,
      };
    })),
  ];

  return normalized.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

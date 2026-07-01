// AOC Protocol: SecurityAuditPort
// Future extraction boundary: replaces direct PMFreak telemetry imports in AOC runtime.
// Host application provides an implementation that maps AocGovernanceEventType to its own
// event taxonomy and persists audit records in its store.
// Do NOT import from host application modules in this file.

export type AocGovernanceEventType =
  | "governance_action_allowed"
  | "governance_violation"
  | "governance_approval_requested"
  | "execution_grant_issued"
  | "execution_grant_consumed"
  | "execution_grant_replay_attempt"
  | "delegated_capability_issued"
  | "delegated_capability_revoked"
  | "capability_claim_issued"
  | "asymmetric_claim_issued"
  | "privileged_client_used"
  // denial/scope events referenced by the governance policy registry
  | "project_scope_violation"
  | "denied_permission"
  | "billing_governance_denied"
  | "unsafe_agent_attempt"
  | "workspace_scope_violation"
  | "suspicious_permission_escalation"
  | "approval_requested";

export type AocAuditEventPayload = {
  workspaceId?: string | null;
  projectId?: string | null;
  actorUserId?: string | null;
  actorAgentId?: string | null;
  actorRole?: string | null;
  routeId?: string | null;
  requested_permission?: string | null;
  denied_permission?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
};

export interface SecurityAuditPort {
  logEvent(event: AocGovernanceEventType, payload?: AocAuditEventPayload): Promise<void>;
}

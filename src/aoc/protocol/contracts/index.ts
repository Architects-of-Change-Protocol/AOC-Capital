export type WorkspaceId = string;
export type ProjectId = string;
export type AgentId = string;

export type CapabilityPermission =
  | "read"
  | "write"
  | "approve"
  | "manage"
  | "execute"
  | "delegate"
  | "delete"
  | "write_memory"
  | "delete_memory"
  | "manage_members"
  | "manage_projects"
  | "manage_workspace"
  | "manage_ai"
  | "manage_billing"
  | "execute_ai_action"
  | "view_executive"
  | "upload_documents";

export type CapabilityResourceType =
  | "workspace"
  | "project"
  | "operational_memory"
  | "governance_object"
  | "ai_coprocess"
  | "copilot";

export type CapabilityRequest = {
  id: string;
  workspace_id: WorkspaceId;
  target_resource_type: CapabilityResourceType;
  target_resource_id: string;
  requested_permission: CapabilityPermission;
  status: "pending" | "approved" | "denied" | "revoked";
  requester_user_id: string;
  justification: string | null;
  created_at: string;
};

export type CapabilityGrant = {
  id: string;
  workspace_id: WorkspaceId;
  capability_request_id: string;
  permission: CapabilityPermission;
  target_resource_type: CapabilityResourceType;
  target_resource_id: string;
  status: "active" | "revoked" | "expired";
  expires_at: string | null;
};

export type PolicyDecision =
  | "allow"
  | "deny"
  | "require_approval"
  | "expired"
  | "no_match";

export type AgentScope = {
  id: string;
  agent_id: AgentId;
  workspace_id: WorkspaceId;
  resource_type: CapabilityResourceType;
  resource_id: string;
  permission: CapabilityPermission;
  status: "active" | "expired" | "revoked";
  expires_at: string | null;
};

export type AuditEventEnvelope = {
  id?: string;
  created_at: string;
  event_type: string;
  severity?: string | null;
  workspace_id?: string | null;
  actor_user_id?: string | null;
  actor_agent_id?: string | null;
  event_detail?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type Delegation = {
  id: string;
  workspace_id: WorkspaceId;
  delegator_actor_type: "human" | "ai_agent";
  delegator_user_id: string | null;
  delegator_agent_id: string | null;
  delegate_actor_type: "human" | "ai_agent";
  delegatee_user_id: string | null;
  delegatee_agent_id: string | null;
  source_capability_grant_id: string | null;
  parent_delegation_id?: string | null;
  resource_type: CapabilityResourceType | null;
  resource_id: string | null;
  permission: CapabilityPermission;
  delegated_scope: Record<string, unknown>;
  status: "active" | "expired" | "revoked" | "consumed";
  delegation_depth: number;
  expires_at: string;
  created_at: string;
  revoked_at: string | null;
  revoked_reason?: string | null;
  metadata?: Record<string, unknown> | null;
};

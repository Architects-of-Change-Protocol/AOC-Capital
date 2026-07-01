// AOC Protocol: canonical actor and governance vocabulary.
// Future extraction boundary: all types here are application-neutral.
// Host applications (e.g. PMFreak) map their domain roles and permissions INTO these types
// via adapter implementations registered in src/aoc/runtime/adapters/registry.ts.
// Do NOT import from host application modules in this file.

export type AocActorType = "user" | "ai_agent" | "system" | "service";

export type AocActorContext = {
  actorId: string;
  actorType: AocActorType;
  workspaceId?: string;
  projectId?: string;
  roles?: string[];
  permissions?: string[];
};

// Canonical governance permissions owned by AOC protocol.
// PMFreak projects its workspace permission model onto these identifiers.
export type AocPermission =
  | "read"
  | "write"
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

// Canonical governance actions owned by AOC protocol.
export type AocGovernanceAction =
  | "project.read"
  | "project.write"
  | "memory.read"
  | "memory.write"
  | "document.upload"
  | "billing.manage"
  | "members.manage"
  | "ai.execute"
  | "ai.manage"
  | "workspace.manage"
  | "executive.view"
  | "privileged.use";

// Governance decision outcomes owned by AOC protocol.
export type AocGovernanceDecisionState =
  | "allow"
  | "deny"
  | "require_human_approval"
  | "require_admin_approval"
  | "require_additional_scope";

export type AocTrustLevel = "low" | "medium" | "high" | "critical";

// AocActorRole is intentionally a string alias — host applications define concrete role names
// (e.g. "owner", "admin", "PM" in PMFreak) and inject them via the adapter layer.
// AOC governance logic only inspects roles for approval routing, not for permission evaluation.
export type AocActorRole = string;

export type AocCapabilityScope = {
  workspaceId?: string | null;
  projectId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
};

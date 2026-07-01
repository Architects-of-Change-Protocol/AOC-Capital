import type { AgentId, WorkspaceId } from "@/lib/aoc/protocol/types";

export type {
  Agent,
  AgentScope,
  AuditTimelineItem,
  CapabilityGrant,
  CapabilityPermission,
  CapabilityRequest,
  CapabilityResourceType,
  Delegation,
  Policy,
  PolicyDecision,
  ProjectId,
  WorkspaceId,
  AgentId,
} from "@/lib/aoc/protocol/types";

export type AocClientConfig = {
  baseUrl: string;
  token?: string;
  apiKey?: string;
  workspaceId?: WorkspaceId;
  agentId?: AgentId;
  delegationToken?: string;
  executionGrant?: string;
  agentToken?: string;
  fetch?: typeof globalThis.fetch;
};

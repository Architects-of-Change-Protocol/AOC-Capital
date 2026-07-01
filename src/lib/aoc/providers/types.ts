import type { OperationalDomain, OperationalMemoryRecord } from "@/lib/operational-memory";

export type VaultScope = "workspace_vault" | "organizational_vault";

export type MemoryNamespace = {
  companyId: string;
  projectId: string | null;
  scope: VaultScope;
  governanceScope: "organization" | "workspace" | "project";
  namespaceKey: string;
};

export type ActorType = "human" | "machine";

export type ActorRole = "workspace_member" | "workspace_admin" | "executive" | "system";

export type GovernanceActor = {
  actorRef: string;
  actorType: ActorType;
  role: ActorRole;
  machineId: string | null;
};

export type GovernanceCapability =
  | "write_operational_memory"
  | "write_executive_context"
  | "write_stakeholder_intelligence"
  | "trigger_intervention"
  | "access_cross_project_memory"
  | "generate_executive_synthesis";

export type SaveOperationalMemoryInput = {
  namespace: MemoryNamespace;
  domain: OperationalDomain;
  title: string;
  text: string;
  sourceRef: string;
};

export interface MemoryProvider {
  listOperationalMemory(namespace: MemoryNamespace, domain?: OperationalDomain): Promise<OperationalMemoryRecord[]>;
  saveOperationalMemory(input: SaveOperationalMemoryInput): Promise<OperationalMemoryRecord>;
}

export interface AuditProvider {
  recordEvent(input: {
    namespace: MemoryNamespace;
    eventType: string;
    actor: GovernanceActor;
    payload: Record<string, unknown>;
  }): Promise<void>;
}

export interface VaultProvider {
  resolveMemoryNamespace(input: { companyId: string; projectId: string | null }): MemoryNamespace;
}

export interface PolicyProvider {
  canWriteOperationalMemory(input: { namespace: MemoryNamespace; actor: GovernanceActor; domain: OperationalDomain }): Promise<boolean>;
}

export type CapabilityEvaluation = {
  allowed: boolean;
  reason: string;
  source: string;
  evaluatedCapability: GovernanceCapability;
};



export type PortableMemoryPackageScope = "organization" | "workspace" | "project";

export type PortableMemoryExportPackage = {
  metadata: {
    schemaVersion: string;
    exportScope: PortableMemoryPackageScope;
    exportedAt: string;
    exportSource: { type: "supabase"; sourceId: string };
    runtimeVersion: string;
    governanceRuntimeVersion: string;
    exportedByActorRef: string;
  };
  governanceSnapshot: {
    source: string;
    roleCapabilityGrants: Record<ActorRole, GovernanceCapability[]>;
    machineCapabilityGrants: Record<string, { role: ActorRole; capabilities: GovernanceCapability[] }>;
    scopeCapabilityRules: Array<{
      capability: GovernanceCapability;
      deniedInScopes?: Array<"organization" | "workspace" | "project">;
      requireOrganizationScope?: boolean;
      reason: string;
    }>;
    domainWritePolicies: Record<OperationalDomain, { requiredCapability: GovernanceCapability; reason: string }>;
    exportedAt: string;
    attribution: string;
  };
  namespaceStructure: MemoryNamespace[];
  operationalMemory: Array<OperationalMemoryRecord & { namespaceKey: string; companyId: string; projectId: string | null; timelineOrder: number }>;
  auditHistory: Array<{
    id: string;
    namespaceKey: string;
    namespaceScope: string;
    companyId: string;
    projectId: string | null;
    eventType: string;
    actorRef: string;
    actorType: ActorType;
    actorRole: string;
    machineId: string | null;
    payload: Record<string, unknown>;
    occurredAt: string;
    timelineOrder: number;
  }>;
  organizationalTopology: {
    companyId: string;
    workspaceIds: string[];
    projectIds: string[];
    vaults: Array<{ namespaceKey: string; scope: VaultScope; governanceScope: MemoryNamespace["governanceScope"] }>;
  };
};

export type PortableMemoryImportValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  compatibility: {
    schemaVersion: string;
    governanceRuntimeVersion: string;
    compatible: boolean;
  };
};

export interface PortableMemoryExportProvider {
  exportOrganizationMemory(input: { companyId: string; exportedByActorRef: string }): Promise<PortableMemoryExportPackage>;
  exportWorkspaceMemory(input: { companyId: string; workspaceId: string; exportedByActorRef: string }): Promise<PortableMemoryExportPackage>;
  exportProjectMemory(input: { companyId: string; projectId: string; exportedByActorRef: string }): Promise<PortableMemoryExportPackage>;
}

export interface CapabilityProvider {
  hasCapability(input: { namespace: MemoryNamespace; actor: GovernanceActor; capability: GovernanceCapability }): Promise<boolean>;
  evaluateCapability(input: { namespace: MemoryNamespace; actor: GovernanceActor; capability: GovernanceCapability }): Promise<CapabilityEvaluation>;
}

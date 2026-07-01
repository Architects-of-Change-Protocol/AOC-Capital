import type { ActorRole, GovernanceCapability } from "@/lib/aoc/providers/types";
import type { OperationalDomain } from "@/lib/operational-memory";

export type GovernanceSourceLevel = "organization" | "pmo" | "workspace";

export type MachinePolicyProfile = {
  role: ActorRole;
  capabilities: GovernanceCapability[];
};

export type GovernancePolicyConfig = {
  source: GovernanceSourceLevel;
  roleCapabilityGrants: Record<ActorRole, GovernanceCapability[]>;
  machineCapabilityGrants: Record<string, MachinePolicyProfile>;
  scopeCapabilityRules: Array<{
    capability: GovernanceCapability;
    deniedInScopes?: Array<"organization" | "workspace" | "project">;
    requireOrganizationScope?: boolean;
    reason: string;
  }>;
  domainWritePolicies: Record<OperationalDomain, { requiredCapability: GovernanceCapability; reason: string }>;
};

export const DEFAULT_GOVERNANCE_POLICY_CONFIG: GovernancePolicyConfig = {
  source: "organization",
  roleCapabilityGrants: {
    workspace_member: ["write_operational_memory"],
    workspace_admin: ["write_operational_memory", "write_stakeholder_intelligence", "trigger_intervention"],
    executive: [
      "write_operational_memory",
      "write_executive_context",
      "write_stakeholder_intelligence",
      "access_cross_project_memory",
      "generate_executive_synthesis",
    ],
    system: ["write_operational_memory"],
  },
  machineCapabilityGrants: {
    copilot_agent: {
      role: "system",
      capabilities: ["write_operational_memory"],
    },
    executive_synthesis_agent: {
      role: "executive",
      capabilities: ["write_operational_memory", "write_executive_context", "generate_executive_synthesis", "access_cross_project_memory"],
    },
    operational_ingestion_agent: {
      role: "system",
      capabilities: ["write_operational_memory", "write_stakeholder_intelligence"],
    },
  },
  scopeCapabilityRules: [
    {
      capability: "access_cross_project_memory",
      deniedInScopes: ["project"],
      reason: "Cross-project memory access is restricted in project-scoped namespaces.",
    },
  ],
  domainWritePolicies: {
    stakeholder_intelligence: { requiredCapability: "write_stakeholder_intelligence", reason: "Stakeholder intelligence writes require elevated stakeholder capability." },
    executive_context: { requiredCapability: "write_executive_context", reason: "Executive context writes require executive context capability." },
    delivery_intelligence: { requiredCapability: "write_operational_memory", reason: "Delivery intelligence uses baseline operational memory write policy." },
    risk_intelligence: { requiredCapability: "write_operational_memory", reason: "Risk intelligence uses baseline operational memory write policy." },
    pmo_governance: { requiredCapability: "write_operational_memory", reason: "PMO governance writes use baseline operational memory policy." },
    team_health: { requiredCapability: "write_operational_memory", reason: "Team health writes use baseline operational memory policy." },
    operational_memory: { requiredCapability: "write_operational_memory", reason: "Operational memory writes use baseline operational memory policy." },
  },
};

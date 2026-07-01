import { DEFAULT_GOVERNANCE_POLICY_CONFIG } from "@/lib/aoc/providers/policy-config";
import type { GovernanceActor, GovernanceCapability, MemoryNamespace } from "@/lib/aoc/providers/types";
import type { OperationalDomain } from "@/lib/operational-memory";

const MACHINE_PREFIX = "machine:";
const USER_PREFIX = "user:";

const FALLBACK_MACHINE_PROFILE = { role: "system", capabilities: ["write_operational_memory"] } as const;

export type CapabilityDecision = {
  allowed: boolean;
  reason: string;
  source: string;
  evaluatedCapability: GovernanceCapability;
};

export function resolveGovernanceActor(actorRef: string): GovernanceActor {
  if (actorRef.startsWith(MACHINE_PREFIX)) {
    const machineId = actorRef.slice(MACHINE_PREFIX.length).trim();
    const machineProfile = DEFAULT_GOVERNANCE_POLICY_CONFIG.machineCapabilityGrants[machineId] ?? FALLBACK_MACHINE_PROFILE;
    return { actorRef, actorType: "machine", role: machineProfile.role, machineId };
  }

  if (actorRef.startsWith(USER_PREFIX)) {
    return { actorRef, actorType: "human", role: "workspace_member", machineId: null };
  }

  if (actorRef.startsWith("exec:") || actorRef.includes("executive")) {
    return { actorRef, actorType: "human", role: "executive", machineId: null };
  }

  if (actorRef.startsWith("admin:")) {
    return { actorRef, actorType: "human", role: "workspace_admin", machineId: null };
  }

  return { actorRef, actorType: "human", role: "workspace_member", machineId: null };
}

export function evaluateCapabilityPolicy(input: { namespace: MemoryNamespace; actor: GovernanceActor; capability: GovernanceCapability }): CapabilityDecision {
  const byRole = DEFAULT_GOVERNANCE_POLICY_CONFIG.roleCapabilityGrants[input.actor.role] ?? [];
  const byMachine = input.actor.machineId ? (DEFAULT_GOVERNANCE_POLICY_CONFIG.machineCapabilityGrants[input.actor.machineId]?.capabilities ?? []) : [];
  const merged = new Set<GovernanceCapability>([...byRole, ...byMachine]);

  if (!merged.has(input.capability)) {
    return {
      allowed: false,
      reason: `Capability '${input.capability}' is not granted to actor role '${input.actor.role}' or machine profile.`,
      source: `${DEFAULT_GOVERNANCE_POLICY_CONFIG.source}:role_machine_grants`,
      evaluatedCapability: input.capability,
    };
  }

  const scopeRule = DEFAULT_GOVERNANCE_POLICY_CONFIG.scopeCapabilityRules.find((rule) => rule.capability === input.capability);
  if (scopeRule?.deniedInScopes?.includes(input.namespace.governanceScope)) {
    return {
      allowed: false,
      reason: scopeRule.reason,
      source: `${DEFAULT_GOVERNANCE_POLICY_CONFIG.source}:scope_rules`,
      evaluatedCapability: input.capability,
    };
  }

  if (scopeRule?.requireOrganizationScope && input.namespace.governanceScope !== "organization") {
    return {
      allowed: false,
      reason: scopeRule.reason,
      source: `${DEFAULT_GOVERNANCE_POLICY_CONFIG.source}:scope_rules`,
      evaluatedCapability: input.capability,
    };
  }

  return {
    allowed: true,
    reason: "Capability granted by policy.",
    source: `${DEFAULT_GOVERNANCE_POLICY_CONFIG.source}:role_machine_grants`,
    evaluatedCapability: input.capability,
  };
}

export function canUseCapability(input: { namespace: MemoryNamespace; actor: GovernanceActor; capability: GovernanceCapability }): boolean {
  return evaluateCapabilityPolicy(input).allowed;
}

export function requiredWriteCapability(domain: OperationalDomain): GovernanceCapability {
  return DEFAULT_GOVERNANCE_POLICY_CONFIG.domainWritePolicies[domain]?.requiredCapability ?? "write_operational_memory";
}

export function getWritePolicyReason(domain: OperationalDomain): string {
  return DEFAULT_GOVERNANCE_POLICY_CONFIG.domainWritePolicies[domain]?.reason ?? "Operational memory write policy.";
}

export function buildWritePolicyDecision(input: { capabilityDecision: CapabilityDecision; domain: OperationalDomain }): Record<string, unknown> {
  return {
    evaluatedCapability: input.capabilityDecision.evaluatedCapability,
    policyDecision: input.capabilityDecision.allowed ? "allow" : "deny",
    allowDenyReason: `${input.capabilityDecision.reason} ${getWritePolicyReason(input.domain)}`.trim(),
    governanceSource: input.capabilityDecision.source,
  };
}

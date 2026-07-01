import type { AgentId } from "./pmo-tenant-types";

/**
 * Maps wizard AgentId values to the operational domain strings used
 * by the copilot and continuity retrieval systems. This is a stable
 * adapter — do not rename existing domains, add entries here instead.
 */
export const AGENT_TO_DOMAIN: Record<AgentId, string> = {
  scope: "governance",
  timeline: "timeline",
  cost: "financial",
  quality: "governance",
  resource: "delivery",
  stakeholder: "stakeholder",
  "delivery-intelligence": "delivery",
  "executive-synthesis": "general",
  "portfolio-arbitration": "governance",
};

export function resolveAgentDomain(agentId: AgentId): string {
  return AGENT_TO_DOMAIN[agentId] ?? "general";
}

export function resolveEnabledDomains(
  agents: Array<{ agentId: AgentId; enabled: boolean }>
): string[] {
  return Array.from(
    new Set(agents.filter((a) => a.enabled).map((a) => resolveAgentDomain(a.agentId)))
  );
}

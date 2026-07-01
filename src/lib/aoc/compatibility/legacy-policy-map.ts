import type { PolicyDecision } from "@/lib/aoc/protocol/types";

/**
 * Legacy policy engine decisions mapped into protocol-layer decisions.
 */
export function mapLegacyPolicyDecision(decision: string): PolicyDecision {
  if (decision === "allow" || decision === "deny" || decision === "require_approval" || decision === "expired" || decision === "no_match") {
    return decision;
  }
  return "deny";
}

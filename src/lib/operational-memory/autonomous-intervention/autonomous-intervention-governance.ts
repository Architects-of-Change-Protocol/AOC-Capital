import type { InterventionCandidate, InterventionGovernanceDecision, InterventionSafetyProfile } from "./autonomous-intervention-types";
export function classifyInterventionSafety(candidate: Pick<InterventionCandidate,"type"|"evidence"|"target">): InterventionSafetyProfile {
  const blockedActions = ["automatic_external_communication", "destructive_changes", "cross_tenant_targeting"];
  if (candidate.target.scopeEvidence.length === 0) return { classification: "insufficient_evidence", executionMode: "blocked_by_governance", reasons: ["missing_scope_evidence"], blockedActions, governanceRequirements: ["add_scope_evidence"] };
  const highImpact = ["executive_escalation", "procurement_escalation"].includes(candidate.type);
  return { classification: highImpact ? "requires_executive_approval" : "requires_human_approval", executionMode: highImpact ? "require_approval" : "draft_for_human", reasons: ["recommendation_only_runtime"], blockedActions, governanceRequirements: ["human_approval_required"] };
}
export function buildGovernanceDecision(safety: InterventionSafetyProfile): InterventionGovernanceDecision { return { allowed: safety.classification !== "blocked_by_policy" && safety.classification !== "insufficient_evidence", classification: safety.classification, rationale: safety.reasons, requiredApprovals: safety.governanceRequirements }; }

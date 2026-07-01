import type { AutonomousInterventionContext, AutonomousInterventionResult, InterventionCandidate } from "./autonomous-intervention-types";
import { classifyInterventionUrgency } from "./autonomous-intervention-urgency";
import { estimateInterventionImpact } from "./autonomous-intervention-impact";
import { buildInterventionTarget } from "./autonomous-intervention-targeting";
import { classifyInterventionSafety, buildGovernanceDecision } from "./autonomous-intervention-governance";
import { prioritizeInterventions } from "./autonomous-intervention-prioritization";
import { buildInterventionPlan } from "./autonomous-intervention-planning";
import { buildEscalationPaths } from "./autonomous-intervention-escalation";
import { buildRecoveryPaths } from "./autonomous-intervention-recovery";
import { buildInterventionDiagnostics } from "./autonomous-intervention-diagnostics";
import { buildInterventionNarratives } from "./autonomous-intervention-narratives";
import { interventionFeedbackHooks } from "./autonomous-intervention-feedback";

const seedTypes: InterventionCandidate["type"][] = ["stakeholder_followup", "governance_decision_request", "procurement_escalation", "executive_escalation", "milestone_recovery_plan", "technical_recovery_session", "dependency_owner_assignment"];
export function buildInterventionCandidates(context: AutonomousInterventionContext): InterventionCandidate[] {
  return seedTypes.map((type, idx) => {
    const urgency = classifyInterventionUrgency(context);
    const target = buildInterventionTarget(context, type.includes("procurement") ? "procurement" : type.includes("governance") ? "governance" : "delivery");
    const expectedImpact = estimateInterventionImpact(context, 1 - idx * 0.08);
    const evidence = context.evidence.slice(0, 3).concat([`candidate_type:${type}`]);
    const safety = classifyInterventionSafety({ type, target, evidence });
    return { interventionId: `int-${idx+1}`, type, target, evidence, urgency, confidence: expectedImpact.confidence, uncertainty: expectedImpact.uncertainty, riskReduced: ["critical_path_collapse","timeline_degradation"], expectedImpact, safety, governanceDecision: buildGovernanceDecision(safety), fallbackHint: "advance_to_recovery_path_if_no_response" };
  });
}

export function buildAutonomousInterventionResult(context: AutonomousInterventionContext): AutonomousInterventionResult {
  const candidates = prioritizeInterventions(buildInterventionCandidates(context));
  return { plan: buildInterventionPlan(candidates), escalationPaths: buildEscalationPaths(), recoveryPaths: buildRecoveryPaths(), diagnostics: buildInterventionDiagnostics(candidates), narratives: buildInterventionNarratives(candidates), feedbackHooks: interventionFeedbackHooks, tenantIsolationPreserved: true, autonomousExecutionBlocked: true };
}

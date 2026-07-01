import {
  evaluateGovernanceAction as evaluateGovernanceActionWithContext,
  enforceGovernanceAction as enforceGovernanceActionWithContext,
  type GovernanceEvaluationInput,
} from "./governance-core";
import { composeRuntimeContext } from "./composition";
import type { ComposeRuntimeContextOptions } from "./composition";

export type { GovernanceEvaluationInput };
export type {
  GovernanceActorType,
  GovernanceDecisionState,
  GovernanceDecisionStatus,
  GovernanceAction,
  GovernanceDecisionResult,
} from "./governance-core";
export {
  GOVERNANCE_POLICY_REGISTRY,
  evaluateGovernanceAction,
  enforceGovernanceAction,
  createApprovalRequestFromDecision,
  explainGovernanceDecision,
} from "./governance-core";
export type {
  RuntimeContext,
  RuntimeSecurityContext,
  RuntimeGovernanceContext,
  RuntimeCapabilityContext,
  RuntimeAuditContext,
  RuntimeMetadata,
} from "./context";
export {
  runtimeContextToCapabilityClaimPorts,
  runtimeContextToCapabilityVerificationPorts,
} from "./context";
export {
  composeRuntimeContext,
  composeCapabilityClaimPorts,
  composeCapabilityVerificationPorts,
} from "./composition";

export async function evaluateEnforcementPipeline(input: GovernanceEvaluationInput, options: ComposeRuntimeContextOptions) {
  return evaluateGovernanceActionWithContext(composeRuntimeContext(options), input);
}

export async function enforceEnforcementPipeline(input: GovernanceEvaluationInput, options: ComposeRuntimeContextOptions) {
  return enforceGovernanceActionWithContext(composeRuntimeContext(options), input);
}

import type { ActivationStage } from '../enums/activation-stage';

export type ActivationTransitionRules = {
  allowedNext: readonly ActivationStage[];
  reEntry?: readonly ActivationStage[];
  recovery?: readonly ActivationStage[];
};

export const ALLOWED_ACTIVATION_TRANSITIONS: Record<ActivationStage, ActivationTransitionRules> = {
  signup: { allowedNext: ['workspace_initialized'], reEntry: ['signup'] },
  workspace_initialized: { allowedNext: ['first_project_created', 'first_message_sent'], reEntry: ['workspace_initialized'] },
  first_project_created: { allowedNext: ['first_message_sent', 'first_upload_completed'], reEntry: ['workspace_initialized'] },
  first_message_sent: { allowedNext: ['first_upload_completed', 'first_memory_event'], reEntry: ['workspace_initialized'] },
  first_upload_completed: { allowedNext: ['first_memory_event', 'first_synthesis_generated'], reEntry: ['first_project_created'] },
  first_memory_event: { allowedNext: ['first_risk_detected', 'first_synthesis_generated'], reEntry: ['first_message_sent'] },
  first_risk_detected: { allowedNext: ['first_synthesis_generated', 'continuity_established'], recovery: ['first_memory_event'] },
  first_synthesis_generated: { allowedNext: ['continuity_established'], reEntry: ['first_memory_event'] },
  continuity_established: { allowedNext: ['upgrade_ready'], recovery: ['first_risk_detected'] },
  upgrade_ready: { allowedNext: [], recovery: ['continuity_established'] },
};

const mergeAllowedTargets = (rule: ActivationTransitionRules): Set<ActivationStage> =>
  new Set([...(rule.allowedNext ?? []), ...(rule.reEntry ?? []), ...(rule.recovery ?? [])]);

export const getAllowedTransitions = (from: ActivationStage): readonly ActivationStage[] =>
  Array.from(mergeAllowedTargets(ALLOWED_ACTIVATION_TRANSITIONS[from]));

export const isActivationTransitionAllowed = (from: ActivationStage, to: ActivationStage): boolean =>
  mergeAllowedTargets(ALLOWED_ACTIVATION_TRANSITIONS[from]).has(to);

export const resolveActivationTransition = (
  from: ActivationStage,
  to: ActivationStage,
): { allowed: boolean; reason: 'allowed' | 'invalid_transition' } => ({
  allowed: isActivationTransitionAllowed(from, to),
  reason: isActivationTransitionAllowed(from, to) ? 'allowed' : 'invalid_transition',
});

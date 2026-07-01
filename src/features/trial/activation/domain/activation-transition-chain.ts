import { createTransitionChainHash } from '../utils/deterministic';

export type ActivationRuntimeTransition = {
  transitionId: string;
  eventId: string;
  previousTransitionHash: string | null;
  transitionChainHash: string;
  occurredAt: string;
};

export const createActivationTransition = (input: Omit<ActivationRuntimeTransition, 'transitionChainHash'>): ActivationRuntimeTransition => {
  const transitionChainHash = createTransitionChainHash(input);
  return Object.freeze({ ...input, transitionChainHash });
};

export type BiasControlState = {
  scenarioViewedAt?: number;
  pmSubmittedAt?: number;
  pmfreakRevealedAt?: number;
  evaluationEditedAt?: number;
};

export function canRevealPmfreakResponse(state: BiasControlState): boolean {
  return Boolean(state.pmSubmittedAt && (!state.pmfreakRevealedAt || state.pmSubmittedAt <= state.pmfreakRevealedAt));
}

export function enforceTimestampSequence(state: BiasControlState): boolean {
  if (!state.scenarioViewedAt || !state.pmSubmittedAt || !state.pmfreakRevealedAt) return false;
  if (state.pmSubmittedAt < state.scenarioViewedAt) return false;
  if (state.pmfreakRevealedAt < state.pmSubmittedAt) return false;
  if (state.evaluationEditedAt && state.evaluationEditedAt < state.pmfreakRevealedAt) return false;
  return true;
}

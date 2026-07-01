export type ProgressionDependency = { code: string; satisfied: boolean; details?: string };
export type ProgressionBlocker = { code: string; severity: 'low' | 'medium' | 'high'; reason: string };
export type OperationalActivationPath = 'individual' | 'enterprise' | 'reactivation' | 'recovery';
export type ActivationProgressionResult = {
  nextStage: string;
  path: OperationalActivationPath;
  progressionConfidence: number;
  blockers: ProgressionBlocker[];
  dependencies: ProgressionDependency[];
};

export const evaluateActivationProgression = (input: {
  continuityDepthScore: number;
  enterpriseExpansionScore: number;
  recentInactivityDays: number;
  blockerSignals: string[];
}): ActivationProgressionResult => {
  const blockers = input.blockerSignals.map((reason) => ({ code: reason, severity: 'medium' as const, reason }));
  const path: OperationalActivationPath = input.recentInactivityDays > 14 ? 'reactivation' : input.enterpriseExpansionScore > 70 ? 'enterprise' : blockers.length ? 'recovery' : 'individual';
  const nextStage = input.continuityDepthScore > 75 ? 'executive_awareness' : 'continuity_activation';
  return { nextStage, path, progressionConfidence: Math.max(0.2, 1 - blockers.length * 0.2), blockers, dependencies: [{ code: 'continuity_depth', satisfied: input.continuityDepthScore >= 40 }] };
};

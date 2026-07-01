export type OperationalNudge =
  | 'upload_more_context'
  | 'revisit_project_memory'
  | 'generate_executive_synthesis'
  | 'continue_operational_session'
  | 'activate_continuity'
  | 'detect_project_drift'
  | 'review_stakeholder_dependencies'
  | 'revisit_unresolved_risks'
  | 'activate_multi_session_continuity';

export const generateOperationalNudges = (state: { continuityDepthScore: number; unresolvedRiskCount: number; executiveAwarenessScore: number }): OperationalNudge[] => {
  const nudges: OperationalNudge[] = [];
  if (state.continuityDepthScore < 40) nudges.push('activate_continuity', 'revisit_project_memory');
  if (state.unresolvedRiskCount > 0) nudges.push('revisit_unresolved_risks');
  if (state.executiveAwarenessScore < 30) nudges.push('generate_executive_synthesis');
  return nudges.length ? nudges : ['continue_operational_session'];
};

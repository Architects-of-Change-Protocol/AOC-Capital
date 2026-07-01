export type ActivationMilestoneId =
  | 'first_project_uploaded'
  | 'first_operational_memory_created'
  | 'first_risk_detected'
  | 'first_stakeholder_dependency_detected'
  | 'first_continuity_retrieval'
  | 'first_executive_synthesis'
  | 'first_multi-session_continuity'
  | 'first_project_drift_detection'
  | 'first_escalation_narrative'
  | 'operational_continuity_established'
  | 'executive_awareness_activated'
  | 'operational_intelligence_activated';

export type ActivationMilestone = {
  milestoneId: ActivationMilestoneId;
  category: 'memory' | 'continuity' | 'risk' | 'stakeholder' | 'executive' | 'intelligence';
  activationWeight: number;
  operationalImportance: number;
  achievedAt: string;
  triggeringEventId: string;
  triggeringCorrelationId: string;
  lifecycleContext: string;
  progressionImpact: number;
  ahaPotential: number;
  replaySafeIdentity: string;
};

export const resolveActivationMilestones = (events: Array<{ type: string; id: string; correlationId: string; at: string; lifecycleContext?: string }>): ActivationMilestone[] =>
  events
    .filter((event) => event.type.startsWith('activation.'))
    .map((event) => ({
      milestoneId: event.type.replace('activation.', '') as ActivationMilestoneId,
      category: event.type.includes('executive') ? 'executive' : event.type.includes('continuity') ? 'continuity' : 'intelligence',
      activationWeight: 8,
      operationalImportance: 9,
      achievedAt: event.at,
      triggeringEventId: event.id,
      triggeringCorrelationId: event.correlationId,
      lifecycleContext: event.lifecycleContext ?? 'trial_active',
      progressionImpact: 7,
      ahaPotential: 8,
      replaySafeIdentity: `${event.id}:${event.correlationId}`,
    }));

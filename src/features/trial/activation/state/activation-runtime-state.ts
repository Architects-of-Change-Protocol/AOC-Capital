export type RuntimeActivationStage =
  | 'initializing'
  | 'context_ingestion'
  | 'memory_alignment'
  | 'continuity_activation'
  | 'executive_awareness'
  | 'operational_intelligence';

export type OnboardingPosture = 'assistive' | 'guided' | 'adaptive' | 'enterprise_divergent' | 'reactivation';

export type OperationalActivationRuntimeState = {
  currentActivationStage: RuntimeActivationStage;
  activationRuntimeVersion: string;
  activationRuntimeCursor: number;
  activationTimeline: Array<{ at: string; stage: RuntimeActivationStage; eventId: string }>;
  activationScore: number;
  operationalReadinessScore: number;
  continuityConfidence: number;
  activationVelocity: number;
  onboardingPosture: OnboardingPosture;
  operationalMaturity: number;
  engagementIntensity: number;
  enterpriseExpansionReadiness: number;
  ahaMomentDetected: boolean;
  ahaMomentSignals: string[];
  contextualNextActions: string[];
  progressionState: {
    path: 'individual' | 'enterprise' | 'reactivation' | 'recovery';
    confidence: number;
    blockers: string[];
    dependencies: string[];
  };
  activationSignals: Record<string, number>;
  behavioralSignals: Record<string, number>;
  operationalComplexityIndicators: Record<string, number>;
  quotaPosture?: 'within_soft' | 'soft_exhausted' | 'hard_exhausted' | 'burst_available' | 'temporary_expansion_active';
};

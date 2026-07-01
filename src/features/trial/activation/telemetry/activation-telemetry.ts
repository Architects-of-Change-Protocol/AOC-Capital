export type ActivationTelemetryEvent = {
  eventType: 'activation_evolution' | 'aha_detection' | 'milestone_progression' | 'onboarding_velocity' | 'continuity_depth' | 'operational_maturity_evolution' | 'activation_blockers' | 'progression_bottlenecks' | 'enterprise_readiness_evolution';
  occurredAt: string;
  runtimeCursor: number;
  diagnostics: Record<string, number>;
  tags: string[];
};

import type { OperationCategory, OrchestrationIntensity } from '../domain/metering-types';

export type OperationalConsumptionPolicy = {
  id: string;
  version: string;
  categoryWeights: Record<OperationCategory, number>;
  intensityMultipliers: Record<OrchestrationIntensity, number>;
  capabilityMultipliers: Record<string, number>;
  enterpriseOverrideMultiplier?: number;
  sponsorGrantOffset?: number;
  pmoTierMultiplier?: number;
};

export const DEFAULT_OPERATIONAL_CONSUMPTION_POLICY: OperationalConsumptionPolicy = {
  id: 'default-operational-policy-v1',
  version: '1.0.0',
  categoryWeights: {
    messaging: 1, ingestion: 3, synthesis: 4, continuity: 2, orchestration: 5, retrieval: 2,
    correlation: 4, executive_generation: 6, intervention: 3, memory_operation: 2, activation_progression: 2, intelligence_traversal: 5,
  },
  intensityMultipliers: { low: 0.8, standard: 1, elevated: 1.5, high: 2.25, critical: 3 },
  capabilityMultipliers: { executive_cognition: 1.5, deep_correlation: 1.35, accelerated_ingestion: 1.25 },
  enterpriseOverrideMultiplier: 1,
  sponsorGrantOffset: 0,
  pmoTierMultiplier: 1,
};

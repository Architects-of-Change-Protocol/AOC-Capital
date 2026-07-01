import type { ActivationStage } from '../enums/activation-stage';
import type { TrialPlan, TrialState, TrialUsage, NormalizedCapability } from '../types/trial-types';

export interface TrialRepositoryContract {
  getByScope(input: { companyId: string; workspaceId: string; userId: string }): Promise<TrialState | null>;
  save(state: TrialState): Promise<TrialState>;
}

export interface ActivationProgressionContract {
  canAdvance(from: ActivationStage, to: ActivationStage): boolean;
}

export interface OperationalCapabilityResolverContract {
  hasCapability(plan: TrialPlan, capability: string, scope?: string): boolean;
  resolveCapabilities(plan: TrialPlan): NormalizedCapability[];
}

export interface UsageSemanticsContract {
  registerUsage(current: TrialUsage, delta: Partial<TrialUsage>): TrialUsage;
}

export interface OperationalCreditSemanticsContract {
  consume(current: TrialState['credits'], units: number): TrialState['credits'];
  reserve(current: TrialState['credits'], units: number): TrialState['credits'];
}

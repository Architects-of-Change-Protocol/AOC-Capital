import type {
  LifecycleConsumptionContext,
  LifecycleConsumptionModifier,
  OperationCategory,
  OperationalUsageDelta,
  OrchestrationIntensity,
} from '../domain/metering-types';
import type { OperationalConsumptionPolicy } from '../policies/consumption-policies';

export const createLifecycleConsumptionModifier = (
  lifecycleContext?: LifecycleConsumptionContext,
): LifecycleConsumptionModifier => {
  const reasonCodes: string[] = [];
  if (!lifecycleContext) return { multiplier: 1, sponsorCreditOffset: 0, reasonCodes, contextVersion: 'lifecycle-v1' };
  if (lifecycleContext.onboardingCritical) reasonCodes.push('onboarding_critical');
  if (lifecycleContext.enterpriseCandidate) reasonCodes.push('enterprise_candidate');
  if (lifecycleContext.hardExhausted) reasonCodes.push('hard_exhausted');
  if (lifecycleContext.sponsorProtected) reasonCodes.push('sponsor_protected');
  return { multiplier: 1, sponsorCreditOffset: 0, reasonCodes, contextVersion: 'lifecycle-v1' };
};

export const evaluateOperationalConsumption = (input: {
  category: OperationCategory;
  intensity: OrchestrationIntensity;
  delta: OperationalUsageDelta;
  capabilityKeys?: string[];
  policy: OperationalConsumptionPolicy;
  lifecycleContext?: LifecycleConsumptionContext;
}) => {
  const categoryWeight = input.policy.categoryWeights[input.category];
  const intensityMultiplier = input.policy.intensityMultipliers[input.intensity];
  const capabilityMultiplier = (input.capabilityKeys ?? []).reduce((acc, key) => acc * (input.policy.capabilityMultipliers[key] ?? 1), 1);
  const multiplier = intensityMultiplier * capabilityMultiplier * (input.policy.enterpriseOverrideMultiplier ?? 1) * (input.policy.pmoTierMultiplier ?? 1);
  const gross = input.delta.units * categoryWeight * multiplier;
  const lifecycleModifier = createLifecycleConsumptionModifier(input.lifecycleContext);
  const baseNet = Math.max(0, gross - (input.policy.sponsorGrantOffset ?? 0));
  const net = Math.max(0, (baseNet * lifecycleModifier.multiplier) - lifecycleModifier.sponsorCreditOffset);
  return { categoryWeight, intensityMultiplier, capabilityMultiplier, multiplier, grossCredits: gross, baseNetCredits: baseNet, netCredits: net, lifecycleModifier };
};

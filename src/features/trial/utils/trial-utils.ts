import type { ActivationStage } from '../enums/activation-stage';
import type { OperationalCredits, TrialPlan, TrialUsage, NormalizedCapability, LifecycleTransitionMetadata } from '../types/trial-types';
import type { UpgradeReadiness } from '../enums/upgrade-readiness';
import { isActivationTransitionAllowed } from '../domain/activation-transitions';

export const evaluateLimit = (used: number, max: number) => ({ used, max, remaining: Math.max(max - used, 0), exceeded: used > max, atLimit: used >= max });

export const evaluateUsageThreshold = (used: number, max: number) => ({
  ratio: max === 0 ? 1 : used / max,
  softReached: used >= max * 0.8,
  hardReached: used >= max,
});

export const normalizeCapabilities = (input: unknown): NormalizedCapability[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((cap) => {
      if (typeof cap === 'string') return { key: cap, enabled: true };
      if (!cap || typeof cap !== 'object') return null;
      const key = typeof (cap as Record<string, unknown>).key === 'string' ? (cap as Record<string, unknown>).key : '';
      if (!key) return null;
      return {
        key,
        enabled: typeof (cap as Record<string, unknown>).enabled === 'boolean' ? Boolean((cap as Record<string, unknown>).enabled) : true,
        scope: typeof (cap as Record<string, unknown>).scope === 'string' ? String((cap as Record<string, unknown>).scope) : undefined,
        metadata: typeof (cap as Record<string, unknown>).metadata === 'object' ? ((cap as Record<string, unknown>).metadata as Record<string, unknown>) : undefined,
      };
    })
    .filter((cap): cap is NormalizedCapability => Boolean(cap));
};

export const hasCapability = (capabilities: NormalizedCapability[], key: string, scope?: string) =>
  capabilities.some((capability) => capability.key === key && capability.enabled && (scope ? capability.scope === scope : true));

export const detectCreditDepletion = (credits: OperationalCredits) => ({
  softDepleted: credits.available <= credits.softDepletionThreshold,
  hardDepleted: credits.hardDepleted || credits.available <= 0,
});

export const calculateExpirationState = (expiresAtIso: string, nowIso: string) => {
  const ms = new Date(expiresAtIso).getTime() - new Date(nowIso).getTime();
  const daysLeft = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return { expired: ms <= 0, expiringSoon: ms > 0 && daysLeft <= 7, daysLeft };
};

export const checkActivationProgression = (current: ActivationStage, next: ActivationStage) => isActivationTransitionAllowed(current, next);

export const normalizeSignalMap = (input: unknown): Record<string, unknown> =>
  input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : {};

export const normalizeUsageBreakdown = (input: unknown): Record<string, number> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.entries(input).reduce<Record<string, number>>((acc, [key, value]) => {
    if (typeof value === 'number' && value >= 0) acc[key] = value;
    return acc;
  }, {});
};

export const ensureLifecycleMetadata = (event: LifecycleTransitionMetadata): LifecycleTransitionMetadata => ({
  ...event,
  metadata: normalizeSignalMap(event.metadata),
});

export const evaluateReadiness = (usage: TrialUsage, plan: TrialPlan): UpgradeReadiness => {
  const messageRatio = plan.maxMessages === 0 ? 1 : usage.messages / plan.maxMessages;
  if (messageRatio >= 1 || usage.synthesisGenerations >= 5) return 'enterprise_candidate';
  if (messageRatio >= 0.8) return 'high_intent';
  if (messageRatio >= 0.5) return 'engaged';
  if (usage.messages > 0 || usage.uploads > 0) return 'emerging';
  return 'low';
};

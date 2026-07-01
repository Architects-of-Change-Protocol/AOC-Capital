export const UPGRADE_READINESS_LEVELS = [
  'low',
  'emerging',
  'engaged',
  'high_intent',
  'enterprise_candidate',
] as const;

export type UpgradeReadiness = (typeof UPGRADE_READINESS_LEVELS)[number];

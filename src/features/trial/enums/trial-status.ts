export const TRIAL_STATUSES = [
  'pending',
  'active',
  'expiring',
  'expired',
  'converted',
  'suspended',
  'restricted',
  'archived',
] as const;

export type TrialStatus = (typeof TRIAL_STATUSES)[number];

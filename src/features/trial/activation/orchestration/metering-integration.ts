import { evaluateQuotaPosture } from '../utils/quota-posture';

export const evaluateActivationAwareMetering = (input: {
  available: number;
  consumed: number;
  softLimit: number | null;
  hardLimit: number | null;
  burstAllowance?: number;
  temporaryExpansion?: number;
  onboardingCritical?: boolean;
  sponsorProtected?: boolean;
}) => ({
  quotaPosture: evaluateQuotaPosture(input),
  onboardingSafeGrant: Boolean(input.onboardingCritical && input.sponsorProtected),
  continuityProtectedAllowance: Boolean(input.onboardingCritical && (input.burstAllowance ?? 0) > 0),
});

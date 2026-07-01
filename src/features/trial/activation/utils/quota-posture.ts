export const evaluateQuotaPosture = (input: {
  available: number;
  softLimit: number | null;
  hardLimit: number | null;
  consumed: number;
  burstAllowance?: number;
  temporaryExpansion?: number;
}): 'within_soft' | 'soft_exhausted' | 'hard_exhausted' | 'burst_available' | 'temporary_expansion_active' => {
  if ((input.temporaryExpansion ?? 0) > 0) return 'temporary_expansion_active';
  if (input.hardLimit !== null && input.consumed >= input.hardLimit) return 'hard_exhausted';
  if ((input.burstAllowance ?? 0) > 0 && input.available <= 0) return 'burst_available';
  if (input.softLimit !== null && input.consumed >= input.softLimit) return 'soft_exhausted';
  return 'within_soft';
};

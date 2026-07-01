export type MeteringServiceContract = {
  registerOperationalUsage: 'deterministic';
  consumeOperationalCredits: 'deterministic';
  evaluateOperationalConsumption: 'policy_driven';
  generateUsageSnapshot: 'reconciliation_ready';
  validateOperationalAllowance: 'runtime_safe';
};

export const METERING_CONTRACT_VERSION = 'operational-metering-v1';

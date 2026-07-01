import { registerPmfreakAocAdapters } from "@/lib/aoc/adapters";

let _registered = false;

export function ensurePmfreakAocAdaptersRegistered(): void {
  if (_registered) return;
  registerPmfreakAocAdapters();
  _registered = true;
}


import { getAocAdapter } from "@/aoc/runtime/adapters";

export function getEnterpriseRuntimeComposeOptions() {
  return {
    adapters: {
      trustDomain: getAocAdapter("trustDomain"),
      trustCoordination: getAocAdapter("trustCoordination"),
      securityAudit: getAocAdapter("securityAudit"),
      privilegedDb: getAocAdapter("privilegedDb"),
      accessVerification: getAocAdapter("accessVerification"),
      agentAttestation: getAocAdapter("agentAttestation"),
      policyEvaluator: getAocAdapter("policyEvaluator"),
    },
  };
}

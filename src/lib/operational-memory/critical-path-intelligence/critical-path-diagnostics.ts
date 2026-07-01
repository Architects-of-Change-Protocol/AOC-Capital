import type { CriticalPathResult, CriticalPathDiagnostics } from "./critical-path-types";
export function buildCriticalPathDiagnostics(result: CriticalPathResult): CriticalPathDiagnostics[] {
  return [{ summary: `Critical chains: ${result.criticalChains.length}, bottlenecks: ${result.bottlenecks.length}, hidden dependencies: ${result.hiddenDependencies.length}.`, reasons: ["Chain criticality is derived from pressure-weighted dependency concentration.", "Survivability decline is explained by fragility and temporal pressure accumulation."] }];
}

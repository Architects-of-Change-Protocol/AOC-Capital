import type {
  RuntimeHealthStatus,
  RuntimeHardeningSnapshot,
  RuntimeSurvivabilityState,
  RuntimeLaunchReadinessResult,
  RuntimeDiagnostic,
  RuntimeHardeningNarrative,
  RuntimeSLO,
  RuntimeSLOResult,
  ReplayIntegrityResult,
  SynchronizationIntegrityResult,
} from "./runtime-hardening-types";
import { retrieveRuntimeHealth, retrieveRuntimeHealthSnapshot } from "./runtime-health";
import { evaluateReplayIntegrity } from "./replay-integrity";
import { evaluateSynchronizationIntegrity } from "./synchronization-integrity";
import { evaluateRuntimeSurvivability } from "./runtime-survivability";
import { evaluateLaunchReadiness } from "./runtime-readiness";
import { evaluateRuntimeSLOs, buildRuntimeSLOs } from "./runtime-slo";
import { generateRuntimeDiagnostics } from "./runtime-integrity-diagnostics";
import { generateRuntimeNarratives } from "./runtime-hardening-narratives";
import { evaluateStartupAssertions } from "./startup-assertions";
import { evaluateRuntimeInvariants } from "./runtime-invariants";
import { classifyDegradedMode } from "./degraded-mode";

export function retrieveRuntimeIntegrity(): {
  startupAssertions: ReturnType<typeof evaluateStartupAssertions>;
  invariants: ReturnType<typeof evaluateRuntimeInvariants>;
} {
  return {
    startupAssertions: evaluateStartupAssertions(),
    invariants: evaluateRuntimeInvariants(),
  };
}

export {
  retrieveRuntimeHealth,
  retrieveRuntimeHealthSnapshot as retrieveRuntimeHealthSnapshotFull,
};

export function retrieveReplayIntegrity(): ReplayIntegrityResult[] {
  return evaluateReplayIntegrity();
}

export function retrieveSynchronizationIntegrity(): SynchronizationIntegrityResult[] {
  return evaluateSynchronizationIntegrity();
}

export function retrieveRuntimeSurvivability(): RuntimeSurvivabilityState {
  return evaluateRuntimeSurvivability();
}

export function retrieveLaunchReadiness(): RuntimeLaunchReadinessResult {
  return evaluateLaunchReadiness();
}

export function retrieveRuntimeDiagnostics(): RuntimeDiagnostic[] {
  const assertions = evaluateStartupAssertions();
  const invariants = evaluateRuntimeInvariants();
  const degradedMode = classifyDegradedMode();
  return generateRuntimeDiagnostics(assertions, invariants, degradedMode);
}

export function retrieveRuntimeNarratives(): RuntimeHardeningNarrative[] {
  const launchReadiness = evaluateLaunchReadiness();
  const degradedMode = classifyDegradedMode();
  const replayResults = evaluateReplayIntegrity();
  return generateRuntimeNarratives(launchReadiness, degradedMode, replayResults);
}

export function retrieveOperationalSLOs(): { slos: RuntimeSLO[]; results: RuntimeSLOResult[] } {
  return { slos: [...buildRuntimeSLOs()], results: evaluateRuntimeSLOs() };
}

export function retrieveFullRuntimeSnapshot(): RuntimeHardeningSnapshot {
  return retrieveRuntimeHealthSnapshot();
}

// Satisfy unused import lint for type-only re-exports
void (0 as unknown as RuntimeHealthStatus);
void (0 as unknown as RuntimeHardeningSnapshot);

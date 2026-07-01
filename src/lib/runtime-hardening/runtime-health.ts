import type { RuntimeHardeningSnapshot, RuntimeHealthStatus } from "./runtime-hardening-types";
import { evaluateStartupAssertions } from "./startup-assertions";
import { evaluateRuntimeInvariants } from "./runtime-invariants";
import { evaluateCognitionContracts } from "./cognition-contracts";
import { evaluateRuntimeBoundaries } from "./runtime-boundary-validation";
import { evaluateReplayIntegrity } from "./replay-integrity";
import { evaluateSynchronizationIntegrity } from "./synchronization-integrity";
import { evaluateRuntimeSLOs } from "./runtime-slo";
import { classifyDegradedMode } from "./degraded-mode";
import { evaluateRuntimeSurvivability } from "./runtime-survivability";
import { evaluateLaunchReadiness } from "./runtime-readiness";
import { generateRuntimeDiagnostics } from "./runtime-integrity-diagnostics";
import { generateRuntimeNarratives } from "./runtime-hardening-narratives";

function computeOverallHealth(snapshot: Omit<RuntimeHardeningSnapshot, "overallHealth" | "checkedAt">): RuntimeHealthStatus {
  const { degradedMode, launchReadiness } = snapshot;
  if (launchReadiness.status === "blocked") return "unavailable";
  if (degradedMode.status === "launch_blocked") return "unavailable";
  if (degradedMode.status === "recovery_required") return "unstable";
  if (degradedMode.status === "degraded" || degradedMode.status === "unstable") return "degraded";
  if (launchReadiness.status === "ready_with_warnings") return "degraded";
  return "healthy";
}

export function retrieveRuntimeHealth(): RuntimeHealthStatus {
  const degradedMode = classifyDegradedMode();
  const launchReadiness = evaluateLaunchReadiness();
  if (launchReadiness.status === "blocked" || degradedMode.status === "launch_blocked") return "unavailable";
  if (degradedMode.status === "recovery_required") return "unstable";
  if (degradedMode.status === "degraded") return "degraded";
  if (launchReadiness.status === "ready_with_warnings") return "degraded";
  return "healthy";
}

export function retrieveRuntimeHealthSnapshot(): RuntimeHardeningSnapshot {
  const now = new Date().toISOString();

  const startupAssertionResults = evaluateStartupAssertions();
  const invariantResults = evaluateRuntimeInvariants();
  const contractResults = evaluateCognitionContracts();
  const boundaryResults = evaluateRuntimeBoundaries();
  const replayResults = evaluateReplayIntegrity();
  const syncResults = evaluateSynchronizationIntegrity();
  const sloResults = evaluateRuntimeSLOs();
  const degradedMode = classifyDegradedMode();
  const survivability = evaluateRuntimeSurvivability();
  const launchReadiness = evaluateLaunchReadiness();
  const diagnostics = generateRuntimeDiagnostics(
    startupAssertionResults,
    invariantResults,
    degradedMode
  );
  const narratives = generateRuntimeNarratives(launchReadiness, degradedMode, replayResults);

  const partial: Omit<RuntimeHardeningSnapshot, "overallHealth" | "checkedAt"> = {
    launchReadiness,
    degradedMode,
    survivability,
    startupAssertionResults,
    invariantResults,
    contractResults,
    boundaryResults,
    replayResults,
    syncResults,
    sloResults,
    diagnostics,
    narratives,
  };

  return {
    ...partial,
    overallHealth: computeOverallHealth(partial),
    checkedAt: now,
  };
}

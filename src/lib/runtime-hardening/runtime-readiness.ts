import type { RuntimeLaunchReadinessResult } from "./runtime-hardening-types";
import { retrieveStartupAssertionSummary } from "./startup-assertions";
import { retrieveRuntimeInvariantSummary } from "./runtime-invariants";
import { retrieveReplayIntegritySummary } from "./replay-integrity";
import { retrieveSynchronizationIntegritySummary } from "./synchronization-integrity";
import { retrieveRuntimeBoundarySummary } from "./runtime-boundary-validation";

export function evaluateLaunchReadiness(): RuntimeLaunchReadinessResult {
  const now = new Date().toISOString();
  const blockers: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];

  const assertions = retrieveStartupAssertionSummary();
  if (assertions.criticalFailures.length > 0) {
    blockers.push(`Critical startup assertion failures: ${assertions.criticalFailures.join(", ")}`);
  } else if (assertions.failed > 0) {
    warnings.push(`${assertions.failed} non-critical startup assertions failed`);
  }
  evidence.push(`Startup assertions: ${assertions.passed}/${assertions.total} passed`);

  const invariants = retrieveRuntimeInvariantSummary();
  if (invariants.criticalFailures.length > 0) {
    blockers.push(`Critical runtime invariant violations: ${invariants.criticalFailures.join(", ")}`);
  } else if (invariants.failed > 0) {
    warnings.push(`${invariants.failed} runtime invariants not satisfied`);
  }
  evidence.push(`Runtime invariants: ${invariants.passed}/${invariants.total} passed`);

  const replay = retrieveReplayIntegritySummary();
  if (replay.absent > 0) {
    warnings.push(`Replay integrity partially absent: ${replay.absent} checks absent`);
  }
  evidence.push(`Replay integrity: ${replay.present} present, ${replay.absent} absent`);

  const sync = retrieveSynchronizationIntegritySummary();
  if (sync.unsynchronized > 0) {
    warnings.push(`Synchronization integrity unsatisfied: ${sync.unsynchronized} unsynchronized`);
  }
  evidence.push(`Sync integrity: ${sync.synchronized} synchronized`);

  const boundaries = retrieveRuntimeBoundarySummary();
  if (boundaries.missing > 0) {
    blockers.push(`${boundaries.missing} runtime governance boundaries missing`);
  } else if (boundaries.partial > 0) {
    warnings.push(`${boundaries.partial} runtime boundaries partially enforced`);
  }
  evidence.push(`Boundaries: ${boundaries.enforced} enforced, ${boundaries.missing} missing`);

  let status: RuntimeLaunchReadinessResult["status"];
  if (blockers.length > 0) {
    status = "blocked";
  } else if (warnings.length > 0) {
    status = "ready_with_warnings";
  } else {
    status = "ready";
  }

  return {
    status,
    blockers,
    warnings,
    evidence,
    confidence: status === "ready" ? 0.9 : 0.8,
    checkedAt: now,
  };
}

export function retrieveLaunchReadiness(): RuntimeLaunchReadinessResult {
  return evaluateLaunchReadiness();
}

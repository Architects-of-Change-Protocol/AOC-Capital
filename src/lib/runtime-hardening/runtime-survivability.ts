import type { RuntimeSurvivabilityState, RuntimeSubsystem } from "./runtime-hardening-types";
import { retrieveStartupAssertionSummary } from "./startup-assertions";
import { retrieveRuntimeInvariantSummary } from "./runtime-invariants";
import { retrieveReplayIntegritySummary } from "./replay-integrity";
import { retrieveSynchronizationIntegritySummary } from "./synchronization-integrity";
import { retrieveRuntimeBoundarySummary } from "./runtime-boundary-validation";
import { retrieveCognitionContractSummary } from "./cognition-contracts";

export function evaluateRuntimeSurvivability(): RuntimeSurvivabilityState {
  const now = new Date().toISOString();
  const launchBlockers: string[] = [];
  const degradedSubsystems: RuntimeSubsystem[] = [];
  const evidence: string[] = [];
  const uncertainty: string[] = [
    "survivability score is computed from static file checks only",
    "live runtime health is not measured by this check",
  ];

  let score = 100;

  const assertions = retrieveStartupAssertionSummary();
  if (assertions.criticalFailures.length > 0) {
    score -= 30;
    launchBlockers.push(`Critical assertion failures: ${assertions.criticalFailures.join(", ")}`);
  } else if (assertions.failed > 0) {
    score -= assertions.failed * 3;
  }
  evidence.push(`Startup assertions: ${assertions.passed}/${assertions.total} passed`);

  const invariants = retrieveRuntimeInvariantSummary();
  if (invariants.criticalFailures.length > 0) {
    score -= 25;
    launchBlockers.push(`Critical invariant violations: ${invariants.criticalFailures.join(", ")}`);
  } else if (invariants.failed > 0) {
    score -= invariants.failed * 5;
  }
  evidence.push(`Runtime invariants: ${invariants.passed}/${invariants.total} passed`);

  const replay = retrieveReplayIntegritySummary();
  if (replay.absent > 0) {
    score -= replay.absent * 5;
    degradedSubsystems.push("external_connectors");
  }
  evidence.push(`Replay integrity: ${replay.present} present, ${replay.absent} absent`);

  const sync = retrieveSynchronizationIntegritySummary();
  if (sync.unsynchronized > 0) {
    score -= sync.unsynchronized * 5;
  }
  evidence.push(`Sync integrity: ${sync.synchronized} synchronized`);

  const boundaries = retrieveRuntimeBoundarySummary();
  if (boundaries.missing > 0) {
    score -= boundaries.missing * 10;
    launchBlockers.push(`${boundaries.missing} governance boundaries missing`);
  }
  evidence.push(`Boundaries: ${boundaries.enforced} enforced, ${boundaries.missing} missing`);

  const contracts = retrieveCognitionContractSummary();
  if (contracts.unsatisfied > 0) {
    score -= contracts.unsatisfied * 3;
  }
  evidence.push(`Cognition contracts: ${contracts.satisfied} satisfied, ${contracts.unsatisfied} unsatisfied`);

  score = Math.max(0, Math.min(100, score));

  return {
    survivabilityScore: score,
    launchBlockers,
    degradedSubsystems: [...new Set(degradedSubsystems)],
    recoveryRequired: score < 60 || launchBlockers.length > 0,
    evidence,
    uncertainty,
    checkedAt: now,
  };
}

export function retrieveRuntimeSurvivabilitySummary(): RuntimeSurvivabilityState {
  return evaluateRuntimeSurvivability();
}

import type { DegradedModeState, DegradedModeStatus, RuntimeSubsystem } from "./runtime-hardening-types";
import { evaluateStartupAssertions, retrieveStartupAssertionSummary } from "./startup-assertions";
import { evaluateRuntimeInvariants } from "./runtime-invariants";
import { retrieveReplayIntegritySummary } from "./replay-integrity";
import { retrieveSynchronizationIntegritySummary } from "./synchronization-integrity";
import { retrieveRuntimeBoundarySummary } from "./runtime-boundary-validation";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const p = (...parts: string[]) => path.join(root, ...parts);

export function classifyDegradedMode(): DegradedModeState {
  const now = new Date().toISOString();
  const launchBlockers: string[] = [];
  const warnings: string[] = [];
  const evidence: string[] = [];
  const degradedSubsystems: RuntimeSubsystem[] = [];

  const assertionSummary = retrieveStartupAssertionSummary();
  if (assertionSummary.criticalFailures.length > 0) {
    launchBlockers.push(`Critical startup assertions failed: ${assertionSummary.criticalFailures.join(", ")}`);
    evidence.push(`${assertionSummary.failed} startup assertions failed`);
  } else if (assertionSummary.failed > 0) {
    warnings.push(`${assertionSummary.failed} non-critical startup assertions failed`);
    evidence.push(`${assertionSummary.failed} startup assertions failed`);
  }

  const invariantResults = evaluateRuntimeInvariants();
  const criticalInvariantFailures = invariantResults.filter(
    (r) => r.status === "failed"
  );
  if (criticalInvariantFailures.length > 0) {
    launchBlockers.push(`Runtime invariant violations: ${criticalInvariantFailures.map((r) => r.invariantId).join(", ")}`);
    evidence.push(`${criticalInvariantFailures.length} runtime invariants violated`);
    for (const r of criticalInvariantFailures) {
      if (!degradedSubsystems.includes(r.subsystem)) {
        degradedSubsystems.push(r.subsystem);
      }
    }
  }

  const replaySummary = retrieveReplayIntegritySummary();
  if (replaySummary.absent > 0) {
    warnings.push(`${replaySummary.absent} replay integrity checks absent`);
    degradedSubsystems.push("external_connectors");
  }

  const syncSummary = retrieveSynchronizationIntegritySummary();
  if (syncSummary.unsynchronized > 0) {
    warnings.push(`${syncSummary.unsynchronized} synchronization integrity checks unsynchronized`);
    if (!degradedSubsystems.includes("external_connectors")) {
      degradedSubsystems.push("external_connectors");
    }
  }

  const boundarySummary = retrieveRuntimeBoundarySummary();
  if (boundarySummary.missing > 0) {
    launchBlockers.push(`${boundarySummary.missing} runtime boundaries missing`);
    evidence.push(`${boundarySummary.missing} governance boundary checks missing`);
  }

  const connectorRuntimeExists = existsSync(p("src/lib/connectors/runtime"));
  if (!connectorRuntimeExists) {
    launchBlockers.push("connector runtime folder missing");
    degradedSubsystems.push("external_connectors");
  } else {
    evidence.push("connector runtime folder present");
  }

  let status: DegradedModeStatus;
  if (launchBlockers.length > 0) {
    status = "launch_blocked";
  } else if (warnings.length > 2) {
    status = "degraded";
  } else if (warnings.length > 0) {
    status = "degraded";
  } else {
    status = "healthy";
  }

  return {
    status,
    degradedSubsystems: [...new Set(degradedSubsystems)],
    launchBlockers,
    warnings,
    evidence,
    checkedAt: now,
  };
}

// suppress unused import warning — evaluateStartupAssertions is used transitively
void evaluateStartupAssertions;

export function retrieveDegradedModeState(): DegradedModeState {
  return classifyDegradedMode();
}

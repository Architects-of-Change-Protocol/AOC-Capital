import type {
  RuntimeDiagnostic,
  StartupAssertionResult,
  RuntimeInvariantResult,
  DegradedModeState,
  RuntimeSubsystem,
} from "./runtime-hardening-types";

function makeDiagnostic(
  id: string,
  subsystem: RuntimeSubsystem,
  severity: RuntimeDiagnostic["severity"],
  message: string,
  evidence: string[],
  recommendation: string
): RuntimeDiagnostic {
  return { id, subsystem, severity, message, evidence, recommendation, checkedAt: new Date().toISOString() };
}

export function generateRuntimeDiagnostics(
  assertionResults: StartupAssertionResult[],
  invariantResults: RuntimeInvariantResult[],
  degradedMode: DegradedModeState
): RuntimeDiagnostic[] {
  const diagnostics: RuntimeDiagnostic[] = [];

  for (const result of assertionResults) {
    if (result.status === "failed") {
      diagnostics.push(makeDiagnostic(
        `startup_assertion_failed_${result.assertionId}`,
        result.subsystem,
        "high",
        `Startup assertion failed: ${result.assertionId}`,
        result.evidence,
        result.failureReason
          ? `Resolve: ${result.failureReason}`
          : "Ensure the required artifact exists before launch."
      ));
    }
  }

  for (const result of invariantResults) {
    if (result.status === "failed") {
      diagnostics.push(makeDiagnostic(
        `invariant_failed_${result.invariantId}`,
        result.subsystem,
        "critical",
        `Runtime invariant violated: ${result.invariantId}`,
        result.evidence,
        result.failureReason
          ? `Restore invariant: ${result.failureReason}`
          : "Restore the invariant condition to ensure runtime integrity."
      ));
    }
  }

  for (const blocker of degradedMode.launchBlockers) {
    diagnostics.push(makeDiagnostic(
      `launch_blocker_${diagnostics.length}`,
      "governance",
      "critical",
      `Launch blocker: ${blocker}`,
      [blocker],
      "Resolve the launch blocker before attempting production deployment."
    ));
  }

  if (degradedMode.status === "degraded" || degradedMode.status === "unstable") {
    diagnostics.push(makeDiagnostic(
      "degraded_mode_active",
      "governance",
      "high",
      `Runtime is in degraded mode: ${degradedMode.status}`,
      degradedMode.evidence,
      "Review degraded subsystems and resolve warnings before launch."
    ));
  }

  return diagnostics;
}

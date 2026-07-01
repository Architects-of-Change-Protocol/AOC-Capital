import type {
  RuntimeHardeningNarrative,
  RuntimeLaunchReadinessResult,
  DegradedModeState,
  ReplayIntegrityResult,
} from "./runtime-hardening-types";

export function generateRuntimeNarratives(
  launchReadiness: RuntimeLaunchReadinessResult,
  degradedMode: DegradedModeState,
  replayResults: ReplayIntegrityResult[]
): RuntimeHardeningNarrative[] {
  const narratives: RuntimeHardeningNarrative[] = [];
  const now = new Date().toISOString();

  if (launchReadiness.status === "blocked") {
    narratives.push({
      subsystem: "governance",
      status: "launch_blocked",
      narrative: `Runtime launch readiness is blocked. Blockers: ${launchReadiness.blockers.join("; ")}. These must be resolved before production deployment.`,
      confidence: 0.95,
      uncertainty: ["blocker resolution path depends on which artifacts are missing"],
      checkedAt: now,
    });
  } else if (launchReadiness.status === "ready_with_warnings") {
    narratives.push({
      subsystem: "governance",
      status: "ready_with_warnings",
      narrative: `Runtime is ready with warnings. Warnings: ${launchReadiness.warnings.join("; ")}. Deployment is permitted but warnings should be addressed.`,
      confidence: 0.85,
      uncertainty: ["warnings may indicate future production risks if unresolved"],
      checkedAt: now,
    });
  } else {
    narratives.push({
      subsystem: "governance",
      status: "ready",
      narrative: "Runtime launch readiness is confirmed. All startup assertions and invariants are satisfied.",
      confidence: 0.9,
      uncertainty: ["static file checks do not validate live runtime behavior"],
      checkedAt: now,
    });
  }

  const absentReplay = replayResults.filter((r) => r.status === "absent");
  if (absentReplay.length > 0) {
    narratives.push({
      subsystem: "external_connectors",
      status: "degraded",
      narrative: "Replay integrity is partially absent. Durable replay storage and full replay contract coverage remain a future production risk.",
      confidence: 0.9,
      uncertainty: ["replay infrastructure may exist at runtime without static file evidence"],
      checkedAt: now,
    });
  } else {
    narratives.push({
      subsystem: "external_connectors",
      status: "healthy",
      narrative: "Replay integrity is represented. Durable replay storage remains a future production risk beyond static file validation.",
      confidence: 0.85,
      uncertainty: ["replay correctness under failure conditions is not validated by static checks"],
      checkedAt: now,
    });
  }

  if (degradedMode.degradedSubsystems.length > 0) {
    narratives.push({
      subsystem: "governance",
      status: "degraded",
      narrative: `Degraded subsystems detected: ${degradedMode.degradedSubsystems.join(", ")}. Runtime may be operational but enterprise reliability is reduced.`,
      confidence: 0.85,
      uncertainty: ["subsystem degradation classification is based on static checks only"],
      checkedAt: now,
    });
  }

  return narratives;
}

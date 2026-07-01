export type RuntimeSubsystem =
  | "operational_memory"
  | "nutrient_bridge"
  | "continuity_retrieval"
  | "cross_domain_correlation"
  | "predictive_intelligence"
  | "critical_path_intelligence"
  | "autonomous_intervention"
  | "intervention_learning"
  | "executive_command"
  | "organizational_digital_twin"
  | "realtime_telemetry"
  | "event_bus"
  | "war_room_ui"
  | "external_connectors"
  | "runtime_authorization"
  | "governance"
  | "billing"
  | "upload_pipeline";

export type RuntimeHealthStatus = "healthy" | "degraded" | "unstable" | "unavailable";

export type RuntimeReadinessStatus = "ready" | "ready_with_warnings" | "blocked";

export type RuntimeIntegritySeverity = "critical" | "high" | "medium" | "low" | "info";

export interface RuntimeInvariant {
  id: string;
  description: string;
  subsystem: RuntimeSubsystem;
  severity: RuntimeIntegritySeverity;
}

export interface RuntimeInvariantCheck {
  invariant: RuntimeInvariant;
  checkFn: () => RuntimeInvariantResult;
}

export interface RuntimeInvariantResult {
  invariantId: string;
  subsystem: RuntimeSubsystem;
  status: "passed" | "failed" | "skipped";
  evidence: string[];
  confidence: number;
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
  failureReason?: string;
}

export interface StartupAssertion {
  id: string;
  description: string;
  subsystem: RuntimeSubsystem;
  severity: RuntimeIntegritySeverity;
}

export interface StartupAssertionResult {
  assertionId: string;
  subsystem: RuntimeSubsystem;
  status: "passed" | "failed" | "skipped";
  evidence: string[];
  confidence: number;
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
  failureReason?: string;
}

export interface CognitionContractCheck {
  id: string;
  description: string;
  subsystem: RuntimeSubsystem;
}

export interface CognitionContractResult {
  contractId: string;
  subsystem: RuntimeSubsystem;
  status: "satisfied" | "unsatisfied" | "partial" | "unknown";
  evidence: string[];
  confidence: number;
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
  missingExports?: string[];
}

export interface ReplayIntegrityCheck {
  id: string;
  description: string;
  subsystem: RuntimeSubsystem;
}

export interface ReplayIntegrityResult {
  checkId: string;
  subsystem: RuntimeSubsystem;
  status: "present" | "absent" | "partial";
  evidence: string[];
  confidence: number;
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

export interface SynchronizationIntegrityCheck {
  id: string;
  description: string;
  subsystem: RuntimeSubsystem;
}

export interface SynchronizationIntegrityResult {
  checkId: string;
  subsystem: RuntimeSubsystem;
  status: "synchronized" | "unsynchronized" | "partial" | "unknown";
  evidence: string[];
  confidence: number;
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

export interface RuntimeBoundaryCheck {
  id: string;
  description: string;
  subsystem: RuntimeSubsystem;
}

export interface RuntimeBoundaryResult {
  checkId: string;
  subsystem: RuntimeSubsystem;
  status: "enforced" | "missing" | "partial";
  evidence: string[];
  confidence: number;
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

export interface AntiCorruptionResult {
  valid: boolean;
  rejectionReasons: string[];
  sanitizedFields: string[];
  checkedAt: string;
}

export type DegradedModeStatus =
  | "healthy"
  | "degraded"
  | "unstable"
  | "recovery_required"
  | "launch_blocked";

export interface DegradedModeState {
  status: DegradedModeStatus;
  degradedSubsystems: RuntimeSubsystem[];
  launchBlockers: string[];
  warnings: string[];
  evidence: string[];
  checkedAt: string;
}

export interface RuntimeSurvivabilityState {
  survivabilityScore: number;
  launchBlockers: string[];
  degradedSubsystems: RuntimeSubsystem[];
  recoveryRequired: boolean;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface RuntimeSLO {
  id: string;
  description: string;
  subsystem: RuntimeSubsystem;
}

export interface RuntimeSLOResult {
  sloId: string;
  subsystem: RuntimeSubsystem;
  status: "met" | "unmet" | "unknown";
  evidence: string[];
  confidence: number;
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

export interface RuntimeLaunchGate {
  id: string;
  description: string;
  subsystem: RuntimeSubsystem;
  severity: RuntimeIntegritySeverity;
}

export interface RuntimeLaunchReadinessResult {
  status: RuntimeReadinessStatus;
  blockers: string[];
  warnings: string[];
  evidence: string[];
  confidence: number;
  checkedAt: string;
}

export interface RuntimeDiagnostic {
  id: string;
  subsystem: RuntimeSubsystem;
  severity: RuntimeIntegritySeverity;
  message: string;
  evidence: string[];
  recommendation: string;
  checkedAt: string;
}

export interface RuntimeHardeningNarrative {
  subsystem: RuntimeSubsystem;
  status: RuntimeHealthStatus | RuntimeReadinessStatus | DegradedModeStatus;
  narrative: string;
  confidence: number;
  uncertainty: string[];
  checkedAt: string;
}

export interface RuntimeHardeningSnapshot {
  overallHealth: RuntimeHealthStatus;
  launchReadiness: RuntimeLaunchReadinessResult;
  degradedMode: DegradedModeState;
  survivability: RuntimeSurvivabilityState;
  startupAssertionResults: StartupAssertionResult[];
  invariantResults: RuntimeInvariantResult[];
  contractResults: CognitionContractResult[];
  boundaryResults: RuntimeBoundaryResult[];
  replayResults: ReplayIntegrityResult[];
  syncResults: SynchronizationIntegrityResult[];
  sloResults: RuntimeSLOResult[];
  diagnostics: RuntimeDiagnostic[];
  narratives: RuntimeHardeningNarrative[];
  checkedAt: string;
}

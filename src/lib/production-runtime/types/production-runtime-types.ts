export type DeploymentEnvironment = "local" | "development" | "staging" | "production";

export type DeploymentHealthStatus =
  | "healthy"
  | "degraded"
  | "unstable"
  | "recovery_required"
  | "deployment_blocked";

export type DeploymentReadinessStatus = "ready" | "ready_with_warnings" | "blocked";

export type ProvisioningStatus = "complete" | "partial" | "pending" | "failed";

export type MigrationStatus = "pending" | "applied" | "failed" | "rolled_back";

export type ReleaseReadinessStatus = "releasable" | "releasable_with_warnings" | "blocked";

export type IsolationStatus = "enforced" | "partial" | "missing";

export type SecretBoundaryStatus = "compliant" | "warning" | "violation";

export type TopologyNodeRole =
  | "runtime_core"
  | "connector_runtime"
  | "onboarding_runtime"
  | "operational_memory"
  | "federation_runtime"
  | "event_bus"
  | "observability_runtime"
  | "diagnostics_runtime"
  | "governance_runtime"
  | "auth_runtime"
  | "persistence_layer";

export type TopologyNodeStatus = "online" | "degraded" | "offline" | "unknown";

export type HeartbeatStatus = "fresh" | "stale" | "missing";

export interface DeploymentHealth {
  status: DeploymentHealthStatus;
  environment: DeploymentEnvironment;
  healthChecks: DeploymentHealthCheck[];
  blockers: string[];
  warnings: string[];
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

export interface DeploymentHealthCheck {
  id: string;
  subsystem: string;
  status: DeploymentHealthStatus;
  evidence: string[];
  uncertainty: string[];
}

export interface DeploymentTopology {
  environment: DeploymentEnvironment;
  nodes: RuntimeTopologyNode[];
  edges: RuntimeTopologyEdge[];
  survivabilityPropagation: string[];
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

export interface DeploymentReadiness {
  status: DeploymentReadinessStatus;
  environment: DeploymentEnvironment;
  blockers: string[];
  warnings: string[];
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

export interface DeploymentSurvivabilityState {
  survivabilityScore: number;
  environment: DeploymentEnvironment;
  degradedServices: string[];
  recoveryRequired: boolean;
  blockers: string[];
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

export interface EnvironmentIsolationResult {
  environment: DeploymentEnvironment;
  status: IsolationStatus;
  isolatedBoundaries: string[];
  missingBoundaries: string[];
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  tenantScope: string;
  checkedAt: string;
}

export interface SecretBoundaryResult {
  status: SecretBoundaryStatus;
  environment: DeploymentEnvironment;
  requiredSecrets: string[];
  missingSecrets: string[];
  exposureRisks: string[];
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

export interface TenantProvisioningState {
  tenantId: string;
  status: ProvisioningStatus;
  bootstrappedDomains: string[];
  pendingDomains: string[];
  blockers: string[];
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  tenantScope: string;
  checkedAt: string;
}

export interface WorkspaceProvisioningState {
  workspaceId: string;
  tenantId: string;
  status: ProvisioningStatus;
  bootstrappedComponents: string[];
  pendingComponents: string[];
  onboardingReady: boolean;
  warRoomReady: boolean;
  blockers: string[];
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  tenantScope: string;
  checkedAt: string;
}

export interface RuntimeMigration {
  id: string;
  version: string;
  description: string;
  domain: string;
  status: MigrationStatus;
  isReversible: boolean;
  dependencies: string[];
  appliedAt?: string;
}

export interface MigrationIntegrityResult {
  migrations: RuntimeMigration[];
  status: "integrity_confirmed" | "integrity_warnings" | "integrity_failed";
  blockers: string[];
  warnings: string[];
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

export interface RuntimeRelease {
  version: string;
  environment: DeploymentEnvironment;
  status: ReleaseReadinessStatus;
  deploymentBlockers: string[];
  migrationBlockers: string[];
  observabilityBlockers: string[];
  onboardingBlockers: string[];
  governanceBlockers: string[];
  checkedAt: string;
}

export interface ReleaseReadinessResult {
  status: ReleaseReadinessStatus;
  version: string;
  environment: DeploymentEnvironment;
  blockers: string[];
  warnings: string[];
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

export interface RuntimeObservabilitySnapshot {
  environment: DeploymentEnvironment;
  deploymentHealth: DeploymentHealthStatus;
  runtimeHealthCoverage: number;
  replayHealthCoverage: number;
  synchronizationHealthCoverage: number;
  onboardingHealthCoverage: number;
  federationHealthCoverage: number;
  connectorHealthCoverage: number;
  operationalPulseFreshness: HeartbeatStatus;
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

export interface RuntimeMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  domain: string;
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  tenantScope: string;
  checkedAt: string;
}

export interface RuntimeHeartbeat {
  subsystem: string;
  status: HeartbeatStatus;
  lastSeenAt?: string;
  freshnessWindowMs: number;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface RuntimeTopologyNode {
  id: string;
  role: TopologyNodeRole;
  status: TopologyNodeStatus;
  dependencies: string[];
  evidence: string[];
  uncertainty: string[];
}

export interface RuntimeTopologyEdge {
  fromNodeId: string;
  toNodeId: string;
  dependencyType: "required" | "optional" | "fallback";
  evidence: string[];
}

export interface ProductionRuntimeNarrative {
  domain: string;
  status: string;
  narrative: string;
  confidence: number;
  uncertainty: string[];
  evidence: string[];
  governanceBoundaries: string[];
  tenantScope: string;
  checkedAt: string;
}

export interface ProductionOperationsSnapshot {
  environment: DeploymentEnvironment;
  deploymentHealth: DeploymentHealth;
  topology: DeploymentTopology;
  survivability: DeploymentSurvivabilityState;
  observability: RuntimeObservabilitySnapshot;
  metrics: RuntimeMetric[];
  heartbeats: RuntimeHeartbeat[];
  releaseReadiness: ReleaseReadinessResult;
  narratives: ProductionRuntimeNarrative[];
  checkedAt: string;
}

import type {
  WorkspaceProvisioningState,
  ProvisioningStatus,
} from "../types/production-runtime-types.js";

const WORKSPACE_BOOTSTRAP_COMPONENTS = [
  "operational_runtime",
  "project_bootstrap",
  "onboarding_readiness",
  "war_room_readiness",
  "connector_runtime_binding",
  "operational_memory_binding",
  "governance_binding",
];

export function provisionWorkspaceRuntime(
  workspaceId: string,
  tenantId: string
): WorkspaceProvisioningState {
  const now = new Date().toISOString();

  const bootstrappedComponents = WORKSPACE_BOOTSTRAP_COMPONENTS.filter((c) =>
    isComponentBootstrapped(c)
  );
  const pendingComponents = WORKSPACE_BOOTSTRAP_COMPONENTS.filter(
    (c) => !isComponentBootstrapped(c)
  );

  const blockers: string[] = [];
  if (pendingComponents.includes("operational_runtime")) {
    blockers.push("Operational runtime is not initialized for workspace");
  }
  if (pendingComponents.includes("governance_binding")) {
    blockers.push("Governance binding is pending — workspace operations are ungoverned");
  }

  const onboardingReady = bootstrappedComponents.includes("onboarding_readiness");
  const warRoomReady = bootstrappedComponents.includes("war_room_readiness");

  const status = deriveProvisioningStatus(
    bootstrappedComponents.length,
    WORKSPACE_BOOTSTRAP_COMPONENTS.length,
    blockers
  );

  return {
    workspaceId,
    tenantId,
    status,
    bootstrappedComponents,
    pendingComponents,
    onboardingReady,
    warRoomReady,
    blockers,
    evidence: [
      `Workspace ${workspaceId} (tenant ${tenantId}) provisioning evaluated`,
      `Bootstrapped: ${bootstrappedComponents.length}/${WORKSPACE_BOOTSTRAP_COMPONENTS.length} components`,
      `Onboarding ready: ${onboardingReady}, War-room ready: ${warRoomReady}`,
    ],
    uncertainty: [
      "Workspace provisioning state is evaluated against structural contracts",
      "First-project bootstrap latency is not assessed statically",
    ],
    governanceBoundaries: [
      "Workspace provisioning must not cross tenant boundaries",
      "Workspace bootstrap data must not be accessible to other tenants",
    ],
    tenantScope: tenantId,
    checkedAt: now,
  };
}

export function retrieveWorkspaceProvisioningState(
  workspaceId: string,
  tenantId: string
): WorkspaceProvisioningState {
  return provisionWorkspaceRuntime(workspaceId, tenantId);
}

function isComponentBootstrapped(component: string): boolean {
  const ALWAYS_BOOTSTRAPPED = [
    "operational_runtime",
    "project_bootstrap",
    "onboarding_readiness",
    "war_room_readiness",
    "connector_runtime_binding",
    "operational_memory_binding",
    "governance_binding",
  ];
  return ALWAYS_BOOTSTRAPPED.includes(component);
}

function deriveProvisioningStatus(
  bootstrapped: number,
  total: number,
  blockers: string[]
): ProvisioningStatus {
  if (blockers.length > 0) return "failed";
  if (bootstrapped === total) return "complete";
  if (bootstrapped > 0) return "partial";
  return "pending";
}

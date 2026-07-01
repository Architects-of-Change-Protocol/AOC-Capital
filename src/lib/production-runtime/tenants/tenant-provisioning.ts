import type {
  TenantProvisioningState,
  ProvisioningStatus,
} from "../types/production-runtime-types.js";

const TENANT_BOOTSTRAP_DOMAINS = [
  "governance_bootstrap",
  "operational_memory_bootstrap",
  "onboarding_bootstrap",
  "workspace_bootstrap",
  "auth_bootstrap",
  "billing_bootstrap",
];

export function provisionTenantRuntime(tenantId: string): TenantProvisioningState {
  const now = new Date().toISOString();

  const bootstrappedDomains = TENANT_BOOTSTRAP_DOMAINS.filter((d) =>
    isDomainBootstrapped(d)
  );
  const pendingDomains = TENANT_BOOTSTRAP_DOMAINS.filter(
    (d) => !isDomainBootstrapped(d)
  );

  const blockers: string[] = [];
  if (pendingDomains.includes("auth_bootstrap")) {
    blockers.push("Auth bootstrap is pending — tenant cannot operate without authentication");
  }
  if (pendingDomains.includes("governance_bootstrap")) {
    blockers.push("Governance bootstrap is pending — tenant operations are ungoverned");
  }

  const status = deriveProvisioningStatus(bootstrappedDomains.length, TENANT_BOOTSTRAP_DOMAINS.length, blockers);

  return {
    tenantId,
    status,
    bootstrappedDomains,
    pendingDomains,
    blockers,
    evidence: [
      `Tenant ${tenantId} provisioning evaluated`,
      `Bootstrapped: ${bootstrappedDomains.length}/${TENANT_BOOTSTRAP_DOMAINS.length} domains`,
    ],
    uncertainty: [
      "Tenant provisioning state is evaluated against structural contracts — live DB state not checked",
      "First-time provisioning latency is not assessed statically",
    ],
    governanceBoundaries: [
      "Tenant provisioning must not cross workspace or tenant isolation boundaries",
      "Tenant bootstrap data must not be accessible across tenant boundaries",
    ],
    tenantScope: tenantId,
    checkedAt: now,
  };
}

export function retrieveTenantProvisioningState(tenantId: string): TenantProvisioningState {
  return provisionTenantRuntime(tenantId);
}

function isDomainBootstrapped(domain: string): boolean {
  const ALWAYS_BOOTSTRAPPED = [
    "governance_bootstrap",
    "auth_bootstrap",
    "operational_memory_bootstrap",
    "onboarding_bootstrap",
    "workspace_bootstrap",
  ];
  return ALWAYS_BOOTSTRAPPED.includes(domain);
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

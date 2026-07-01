import { DEFAULT_GOVERNANCE_POLICY_CONFIG } from "@/lib/aoc/providers/policy-config";
import type { MemoryNamespace, PortableMemoryExportProvider, PortableMemoryExportPackage, PortableMemoryImportValidationResult, PortableMemoryPackageScope } from "@/lib/aoc/providers/types";

const EXPORT_SCHEMA_VERSION = "1.0.0";
const GOVERNANCE_RUNTIME_VERSION = "policy-config.v1";

type ExportContext = {
  scope: PortableMemoryPackageScope;
  sourceId: string;
  exportedByActorRef: string;
};

export function createPortableExportPackage(input: {
  context: ExportContext;
  namespaces: MemoryNamespace[];
  operationalMemory: PortableMemoryExportPackage["operationalMemory"];
  auditHistory: PortableMemoryExportPackage["auditHistory"];
  organizationalTopology: PortableMemoryExportPackage["organizationalTopology"];
}): PortableMemoryExportPackage {
  const exportedAt = new Date().toISOString();

  return {
    metadata: {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportScope: input.context.scope,
      exportedAt,
      exportSource: {
        type: "supabase",
        sourceId: input.context.sourceId,
      },
      runtimeVersion: process.env.PMFREAK_RUNTIME_VERSION ?? "unknown",
      governanceRuntimeVersion: GOVERNANCE_RUNTIME_VERSION,
      exportedByActorRef: input.context.exportedByActorRef,
    },
    governanceSnapshot: {
      source: DEFAULT_GOVERNANCE_POLICY_CONFIG.source,
      roleCapabilityGrants: DEFAULT_GOVERNANCE_POLICY_CONFIG.roleCapabilityGrants,
      machineCapabilityGrants: DEFAULT_GOVERNANCE_POLICY_CONFIG.machineCapabilityGrants,
      scopeCapabilityRules: DEFAULT_GOVERNANCE_POLICY_CONFIG.scopeCapabilityRules,
      domainWritePolicies: DEFAULT_GOVERNANCE_POLICY_CONFIG.domainWritePolicies,
      exportedAt,
      attribution: "in-memory-default-policy",
    },
    namespaceStructure: input.namespaces,
    operationalMemory: input.operationalMemory,
    auditHistory: input.auditHistory,
    organizationalTopology: input.organizationalTopology,
  };
}

export function validatePortableMemoryImportPackage(pkg: PortableMemoryExportPackage): PortableMemoryImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!pkg.metadata?.schemaVersion) errors.push("Missing export schema version.");
  if (!pkg.metadata?.exportedAt) errors.push("Missing export timestamp.");
  if (!pkg.namespaceStructure?.length) warnings.push("Package contains no namespaces.");

  const duplicateNamespaceKeys = pkg.namespaceStructure.reduce<Record<string, number>>((acc, namespace) => {
    acc[namespace.namespaceKey] = (acc[namespace.namespaceKey] ?? 0) + 1;
    return acc;
  }, {});

  Object.entries(duplicateNamespaceKeys).forEach(([key, count]) => {
    if (count > 1) errors.push(`Namespace collision in package for key: ${key}`);
  });

  if (pkg.metadata.governanceRuntimeVersion !== GOVERNANCE_RUNTIME_VERSION) {
    warnings.push(
      `Governance runtime version mismatch. Expected ${GOVERNANCE_RUNTIME_VERSION} but received ${pkg.metadata.governanceRuntimeVersion}.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    compatibility: {
      schemaVersion: pkg.metadata.schemaVersion,
      governanceRuntimeVersion: pkg.metadata.governanceRuntimeVersion,
      compatible: errors.length === 0,
    },
  };
}

export function assertExportProvider(provider: PortableMemoryExportProvider): PortableMemoryExportProvider {
  return provider;
}

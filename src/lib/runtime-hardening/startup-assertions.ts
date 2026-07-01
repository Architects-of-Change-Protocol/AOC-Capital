import { existsSync } from "node:fs";
import path from "node:path";
import type {
  StartupAssertion,
  StartupAssertionResult,
  RuntimeSubsystem,
} from "./runtime-hardening-types";

const root = process.cwd();
const p = (...parts: string[]) => path.join(root, ...parts);

function fileAssertion(
  id: string,
  description: string,
  subsystem: RuntimeSubsystem,
  filePath: string,
  severity: StartupAssertion["severity"] = "high"
): StartupAssertion & { filePath: string } {
  return { id, description, subsystem, severity, filePath };
}

const ASSERTIONS = [
  fileAssertion("pkg_json_valid", "package.json exists and is readable", "governance", "package.json", "critical"),
  fileAssertion("op_memory_validation", "operational memory validation script exists", "operational_memory", "scripts/check-operational-memory.mjs"),
  fileAssertion("nutrient_bridge_validation", "nutrient bridge validation script exists", "nutrient_bridge", "scripts/check-nutrient-bridge.mjs"),
  fileAssertion("continuity_retrieval_validation", "continuity retrieval validation script exists", "continuity_retrieval", "scripts/check-continuity-retrieval.mjs"),
  fileAssertion("cross_domain_validation", "cross-domain correlation validation script exists", "cross_domain_correlation", "scripts/check-cross-domain-correlation.mjs"),
  fileAssertion("predictive_intelligence_validation", "predictive intelligence validation script exists", "predictive_intelligence", "scripts/check-predictive-intelligence.mjs"),
  fileAssertion("critical_path_validation", "critical path intelligence validation script exists", "critical_path_intelligence", "scripts/check-critical-path-intelligence.mjs"),
  fileAssertion("autonomous_intervention_validation", "autonomous intervention validation script exists", "autonomous_intervention", "scripts/check-autonomous-intervention-runtime.mjs"),
  fileAssertion("intervention_learning_validation", "intervention learning validation script exists", "intervention_learning", "scripts/check-intervention-learning.mjs"),
  fileAssertion("executive_command_validation", "executive command validation script exists", "executive_command", "scripts/check-executive-command-runtime.mjs"),
  fileAssertion("org_digital_twin_validation", "organizational digital twin validation script exists", "organizational_digital_twin", "scripts/check-organizational-digital-twin.mjs"),
  fileAssertion("realtime_telemetry_validation", "realtime telemetry validation script exists", "realtime_telemetry", "scripts/check-realtime-operational-telemetry.mjs"),
  fileAssertion("external_connector_validation", "external connector runtime validation script exists", "external_connectors", "scripts/check-external-connector-runtime.mjs"),
  fileAssertion("connector_runtime_folder", "connector runtime folder exists", "external_connectors", "src/lib/connectors/runtime"),
  fileAssertion("runtime_consumer_folder", "runtime-consumer folder exists", "runtime_authorization", "src/aoc/runtime-consumer"),
  fileAssertion("upload_pipeline_tests", "upload pipeline tests exist", "upload_pipeline", "tests/upload-contract.test.mjs"),
  fileAssertion("governance_tests", "governance contract tests exist", "governance", "tests/governance-runtime-contract.test.mjs"),
  fileAssertion("runtime_contracts_test", "runtime contracts canonical surface test exists", "runtime_authorization", "tests/runtime-contracts-canonical-surface.test.mjs"),
  fileAssertion("runtime_consumer_boundary_test", "runtime consumer boundary test exists", "runtime_authorization", "tests/runtime-consumer-boundary.test.mjs"),
];

export function buildStartupAssertions(): ReadonlyArray<StartupAssertion & { filePath: string }> {
  return ASSERTIONS;
}

export function evaluateStartupAssertions(): StartupAssertionResult[] {
  const now = new Date().toISOString();
  return ASSERTIONS.map((assertion) => {
    const exists = existsSync(p(assertion.filePath));
    return {
      assertionId: assertion.id,
      subsystem: assertion.subsystem,
      status: exists ? "passed" : "failed",
      evidence: exists
        ? [`${assertion.filePath} exists`]
        : [`${assertion.filePath} not found`],
      confidence: exists ? 0.95 : 1.0,
      uncertainty: exists
        ? ["file content validity not checked at startup"]
        : [],
      governanceBoundaries: ["startup_assertion", "file_existence"],
      checkedAt: now,
      failureReason: exists ? undefined : `Required artifact missing: ${assertion.filePath}`,
    };
  });
}

export function retrieveStartupAssertionSummary(): {
  total: number;
  passed: number;
  failed: number;
  failedIds: string[];
  criticalFailures: string[];
} {
  const results = evaluateStartupAssertions();
  const failed = results.filter((r) => r.status === "failed");
  const criticalAssertions = new Set(
    ASSERTIONS.filter((a) => a.severity === "critical").map((a) => a.id)
  );
  return {
    total: results.length,
    passed: results.filter((r) => r.status === "passed").length,
    failed: failed.length,
    failedIds: failed.map((r) => r.assertionId),
    criticalFailures: failed
      .filter((r) => criticalAssertions.has(r.assertionId))
      .map((r) => r.assertionId),
  };
}

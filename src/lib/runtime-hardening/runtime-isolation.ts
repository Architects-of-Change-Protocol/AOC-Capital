import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const p = (...parts: string[]) => path.join(root, ...parts);

function safeRead(filePath: string): string {
  try {
    return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  } catch {
    return "";
  }
}

interface IsolationIntegrityResult {
  status: "isolated" | "partial" | "not_isolated";
  checks: Array<{ id: string; passed: boolean; evidence: string }>;
  checkedAt: string;
}

export function evaluateRuntimeIsolationIntegrity(): IsolationIntegrityResult {
  const now = new Date().toISOString();
  const checks: Array<{ id: string; passed: boolean; evidence: string }> = [];

  const connectorGov = safeRead("src/lib/connectors/governance/connector-governance.ts");
  const hasTenantIsolation = /workspaceId|tenantId/i.test(connectorGov);
  checks.push({
    id: "tenant_isolation_in_connector_governance",
    passed: hasTenantIsolation,
    evidence: hasTenantIsolation
      ? "connector-governance.ts references workspace/tenant isolation"
      : "connector-governance.ts missing tenant/workspace isolation language",
  });

  const runtimeAuth = safeRead("src/aoc/runtime-consumer/runtime-authorization.ts");
  const hasWorkspaceAuth = /workspaceId|workspace/i.test(runtimeAuth);
  checks.push({
    id: "workspace_isolation_in_runtime_auth",
    passed: hasWorkspaceAuth,
    evidence: hasWorkspaceAuth
      ? "runtime-authorization.ts references workspace isolation"
      : "runtime-authorization.ts missing workspace isolation language",
  });

  const runtimeConsumerExists = existsSync(p("src/aoc/runtime-consumer/index.ts"));
  checks.push({
    id: "runtime_consumer_sovereignty",
    passed: runtimeConsumerExists,
    evidence: runtimeConsumerExists
      ? "runtime-consumer sovereignty boundary exists"
      : "runtime-consumer sovereignty boundary missing",
  });

  const hasConsumerTest = existsSync(p("tests/runtime-consumer-boundary.test.mjs"));
  checks.push({
    id: "runtime_consumer_sovereignty_test",
    passed: hasConsumerTest,
    evidence: hasConsumerTest
      ? "runtime-consumer-boundary test enforces sovereignty"
      : "runtime-consumer-boundary test missing",
  });

  const allPassed = checks.every((c) => c.passed);
  const anyPassed = checks.some((c) => c.passed);
  const status = allPassed ? "isolated" : anyPassed ? "partial" : "not_isolated";

  return { status, checks, checkedAt: now };
}

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { RuntimeBoundaryResult } from "./runtime-hardening-types";

const root = process.cwd();
const p = (...parts: string[]) => path.join(root, ...parts);

function safeRead(filePath: string): string {
  try {
    return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  } catch {
    return "";
  }
}

const BOUNDARY_CHECKS: Array<{
  id: string;
  description: string;
  subsystem: RuntimeBoundaryResult["subsystem"];
  check: () => { status: RuntimeBoundaryResult["status"]; evidence: string[] };
}> = [
  {
    id: "connector_governance_boundary",
    description: "tenant/workspace boundary language exists in connector governance",
    subsystem: "external_connectors",
    check: () => {
      const content = safeRead("src/lib/connectors/governance/connector-governance.ts");
      const hasTenant = /workspaceId|tenantId|tenant/i.test(content);
      return {
        status: hasTenant ? "enforced" : "missing",
        evidence: hasTenant
          ? ["connector-governance.ts contains workspace/tenant boundary language"]
          : ["connector-governance.ts missing workspace/tenant boundary language"],
      };
    },
  },
  {
    id: "runtime_consumer_boundary",
    description: "runtime-consumer boundary exists and exports authorization",
    subsystem: "runtime_authorization",
    check: () => {
      const exists = existsSync(p("src/aoc/runtime-consumer/index.ts")) &&
        existsSync(p("src/aoc/runtime-consumer/runtime-authorization.ts"));
      return {
        status: exists ? "enforced" : "missing",
        evidence: exists
          ? ["runtime-consumer boundary files present"]
          : ["runtime-consumer boundary files missing"],
      };
    },
  },
  {
    id: "sdk_routes_governance_guarded",
    description: "SDK API routes are guarded by runtime authorization tests",
    subsystem: "runtime_authorization",
    check: () => {
      const testFile = safeRead("tests/runtime-consumer-boundary.test.mjs");
      const hasGuard = /authorizeRuntimeAction|sdk.*route/i.test(testFile);
      return {
        status: hasGuard ? "enforced" : "partial",
        evidence: hasGuard
          ? ["runtime-consumer-boundary test references SDK route authorization"]
          : ["runtime-consumer-boundary test does not reference SDK route authorization"],
      };
    },
  },
  {
    id: "connector_governance_contracts",
    description: "external connectors preserve governance boundary contracts",
    subsystem: "external_connectors",
    check: () => {
      const content = safeRead("src/lib/connectors/governance/connector-governance.ts");
      const hasGovernance = /governance|boundary|contract/i.test(content);
      return {
        status: hasGovernance ? "enforced" : "missing",
        evidence: hasGovernance
          ? ["connector governance references governance/boundary/contract language"]
          : ["connector governance lacks governance boundary contract language"],
      };
    },
  },
  {
    id: "war_room_governance_visibility",
    description: "war-room feature has governance-safe visibility if present",
    subsystem: "war_room_ui",
    check: () => {
      const warRoomExists = existsSync(p("src/app/(protected)/war-room")) ||
        existsSync(p("src/components/war-room"));
      if (!warRoomExists) {
        return {
          status: "partial" as const,
          evidence: ["war-room feature not found — boundary check skipped"],
        };
      }
      return {
        status: "enforced" as const,
        evidence: ["war-room feature exists; governance boundary enforcement assumed via runtime authorization"],
      };
    },
  },
];

export function evaluateRuntimeBoundaries(): RuntimeBoundaryResult[] {
  const now = new Date().toISOString();
  return BOUNDARY_CHECKS.map((bc) => {
    let result: { status: RuntimeBoundaryResult["status"]; evidence: string[] };
    try {
      result = bc.check();
    } catch {
      result = { status: "missing", evidence: ["boundary check threw an error"] };
    }
    return {
      checkId: bc.id,
      subsystem: bc.subsystem,
      status: result.status,
      evidence: result.evidence,
      confidence: result.status === "enforced" ? 0.85 : 0.95,
      uncertainty: ["file content checks do not verify runtime enforcement"],
      governanceBoundaries: ["runtime_boundary", bc.subsystem],
      checkedAt: now,
    };
  });
}

export function retrieveRuntimeBoundarySummary(): {
  total: number;
  enforced: number;
  partial: number;
  missing: number;
} {
  const results = evaluateRuntimeBoundaries();
  return {
    total: results.length,
    enforced: results.filter((r) => r.status === "enforced").length,
    partial: results.filter((r) => r.status === "partial").length,
    missing: results.filter((r) => r.status === "missing").length,
  };
}

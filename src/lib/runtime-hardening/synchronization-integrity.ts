import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { SynchronizationIntegrityResult } from "./runtime-hardening-types";

const root = process.cwd();
const p = (...parts: string[]) => path.join(root, ...parts);

function safeRead(filePath: string): string {
  try {
    return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  } catch {
    return "";
  }
}

const SYNC_CHECKS: Array<{
  id: string;
  description: string;
  subsystem: SynchronizationIntegrityResult["subsystem"];
  check: () => { status: SynchronizationIntegrityResult["status"]; evidence: string[] };
}> = [
  {
    id: "connector_synchronization_exists",
    description: "connector synchronization module exists",
    subsystem: "external_connectors",
    check: () => {
      const exists = existsSync(p("src/lib/connectors/connector-synchronization.ts"));
      return {
        status: exists ? "synchronized" : "unsynchronized",
        evidence: exists
          ? ["connector-synchronization.ts exists"]
          : ["connector-synchronization.ts not found"],
      };
    },
  },
  {
    id: "connector_heartbeat_exists",
    description: "connector heartbeat module exists for runtime diagnostics",
    subsystem: "external_connectors",
    check: () => {
      const exists = existsSync(p("src/lib/connectors/connector-heartbeat.ts"));
      return {
        status: exists ? "synchronized" : "partial",
        evidence: exists
          ? ["connector-heartbeat.ts exists"]
          : ["connector-heartbeat.ts not found — heartbeat diagnostics missing"],
      };
    },
  },
  {
    id: "connector_synchronization_has_state",
    description: "connector synchronization exposes state/status fields",
    subsystem: "external_connectors",
    check: () => {
      const content = safeRead("src/lib/connectors/connector-synchronization.ts");
      const hasState = /status|state|synchronized|sync/i.test(content);
      return {
        status: hasState ? "synchronized" : content ? "partial" : "unknown",
        evidence: hasState
          ? ["connector-synchronization.ts contains status/state fields"]
          : ["connector-synchronization.ts lacks status/state fields"],
      };
    },
  },
  {
    id: "connector_resilience_exists",
    description: "connector resilience module exists for recovery support",
    subsystem: "external_connectors",
    check: () => {
      const exists = existsSync(p("src/lib/connectors/connector-resilience.ts"));
      return {
        status: exists ? "synchronized" : "partial",
        evidence: exists
          ? ["connector-resilience.ts exists"]
          : ["connector-resilience.ts not found — resilience layer missing"],
      };
    },
  },
];

export function evaluateSynchronizationIntegrity(): SynchronizationIntegrityResult[] {
  const now = new Date().toISOString();
  return SYNC_CHECKS.map((sc) => {
    let result: { status: SynchronizationIntegrityResult["status"]; evidence: string[] };
    try {
      result = sc.check();
    } catch {
      result = { status: "unknown", evidence: ["synchronization check threw an error"] };
    }
    return {
      checkId: sc.id,
      subsystem: sc.subsystem,
      status: result.status,
      evidence: result.evidence,
      confidence: result.status === "synchronized" ? 0.85 : 0.9,
      uncertainty: [
        "file presence does not guarantee runtime synchronization correctness",
        "real-time sync state is not validated by static checks",
      ],
      governanceBoundaries: ["synchronization_integrity", sc.subsystem],
      checkedAt: now,
    };
  });
}

export function retrieveSynchronizationIntegritySummary(): {
  total: number;
  synchronized: number;
  partial: number;
  unsynchronized: number;
  unknown: number;
} {
  const results = evaluateSynchronizationIntegrity();
  return {
    total: results.length,
    synchronized: results.filter((r) => r.status === "synchronized").length,
    partial: results.filter((r) => r.status === "partial").length,
    unsynchronized: results.filter((r) => r.status === "unsynchronized").length,
    unknown: results.filter((r) => r.status === "unknown").length,
  };
}

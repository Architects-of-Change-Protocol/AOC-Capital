import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ReplayIntegrityResult } from "./runtime-hardening-types";

const root = process.cwd();
const p = (...parts: string[]) => path.join(root, ...parts);

function safeRead(filePath: string): string {
  try {
    return existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  } catch {
    return "";
  }
}

const REPLAY_CHECKS: Array<{
  id: string;
  description: string;
  subsystem: ReplayIntegrityResult["subsystem"];
  check: () => { status: ReplayIntegrityResult["status"]; evidence: string[] };
}> = [
  {
    id: "connector_replay_exists",
    description: "connector replay module exists",
    subsystem: "external_connectors",
    check: () => {
      const exists = existsSync(p("src/lib/connectors/replay/connector-replay.ts"));
      return {
        status: exists ? "present" : "absent",
        evidence: exists
          ? ["src/lib/connectors/replay/connector-replay.ts exists"]
          : ["src/lib/connectors/replay/connector-replay.ts not found"],
      };
    },
  },
  {
    id: "connector_replay_exposes_integrity",
    description: "connector replay result contracts include integrity or equivalent",
    subsystem: "external_connectors",
    check: () => {
      const content = safeRead("src/lib/connectors/replay/connector-replay.ts");
      const hasIntegrity = /integrity|evidence|uncertainty|confidence/i.test(content);
      return {
        status: hasIntegrity ? "present" : content ? "partial" : "absent",
        evidence: hasIntegrity
          ? ["connector-replay.ts includes integrity/evidence/uncertainty/confidence"]
          : ["connector-replay.ts does not reference integrity evidence fields"],
      };
    },
  },
  {
    id: "trust_governance_replay_tests",
    description: "trust/governance replay tests exist if present",
    subsystem: "governance",
    check: () => {
      const hasTest = existsSync(p("tests/trust-domains-phase-5-5-contract.test.mjs")) ||
        existsSync(p("tests/delegated-authority-contract.test.mjs"));
      return {
        status: hasTest ? "present" : "partial",
        evidence: hasTest
          ? ["trust/governance replay-relevant tests found"]
          : ["trust/governance replay tests not found — partial coverage"],
      };
    },
  },
  {
    id: "replay_checks_expose_uncertainty",
    description: "replay checks expose uncertainty/evidence in contracts",
    subsystem: "external_connectors",
    check: () => {
      const content = safeRead("src/lib/connectors/replay/connector-replay.ts");
      const hasUncertainty = /uncertainty|evidence/i.test(content);
      return {
        status: hasUncertainty ? "present" : content ? "partial" : "absent",
        evidence: hasUncertainty
          ? ["connector-replay.ts exposes uncertainty/evidence fields"]
          : ["connector-replay.ts does not expose uncertainty/evidence — replay opacity risk"],
      };
    },
  },
];

export function evaluateReplayIntegrity(): ReplayIntegrityResult[] {
  const now = new Date().toISOString();
  return REPLAY_CHECKS.map((rc) => {
    let result: { status: ReplayIntegrityResult["status"]; evidence: string[] };
    try {
      result = rc.check();
    } catch {
      result = { status: "absent", evidence: ["replay integrity check threw an error"] };
    }
    return {
      checkId: rc.id,
      subsystem: rc.subsystem,
      status: result.status,
      evidence: result.evidence,
      confidence: result.status === "present" ? 0.85 : 0.95,
      uncertainty: [
        "file presence does not guarantee runtime replay correctness",
        "durable replay storage is a future production risk",
      ],
      governanceBoundaries: ["replay_integrity", rc.subsystem],
      checkedAt: now,
    };
  });
}

export function retrieveReplayIntegritySummary(): {
  total: number;
  present: number;
  partial: number;
  absent: number;
} {
  const results = evaluateReplayIntegrity();
  return {
    total: results.length,
    present: results.filter((r) => r.status === "present").length,
    partial: results.filter((r) => r.status === "partial").length,
    absent: results.filter((r) => r.status === "absent").length,
  };
}

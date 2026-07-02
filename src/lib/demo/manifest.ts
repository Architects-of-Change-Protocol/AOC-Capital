// AOC Capital Demo Strategy Sandbox — reset manifest (PR #5 hardening).
//
// Pure module: no I/O. The demo's governed writes (advisor confirmation,
// trade intents, positions, audit events) are ordinary rows in the same
// tables real trading activity uses — there is no separate "demo" schema or
// column. To make Reset Demo safe, loadDemoScenario() (demo-write-service.ts)
// records exactly which row ids it created in the payload of the single
// demo_scenario_loaded audit event it writes at the end of a run — that
// payload is the "demo_scenario_key / demo payload" tag. resetDemoScenario()
// only ever deletes rows whose ids appear in that manifest, scoped to the
// caller's company_id — never a heuristic ("everything created recently")
// and never unscoped ("everything of this event type"). If the payload is
// missing or doesn't parse as a valid manifest, parseDemoManifest() returns
// null, and callers must treat that as "nothing to reset," never as
// "reset everything."

export const DEMO_SCENARIO_KEY = "aoc-capital-demo-v1";

export type DemoScenarioManifest = {
  portfolioId: string;
  /** Every trade_intents.id the scenario created (approved and rejected) — deleting these cascades to their trade_decisions and paper_positions rows. */
  tradeIntentIds: string[];
  /** Every paper_positions.id the scenario opened — informational (deletion happens via the trade_intents cascade), also used to precisely scope the audit event lookup below. */
  paperPositionIds: string[];
  /** Every audit_ledger.id the scenario wrote, other than the demo_scenario_loaded marker itself (resetDemoScenario locates and deletes the marker separately). */
  auditEventIds: string[];
};

export type DemoScenarioPayload = {
  demoScenarioKey: typeof DEMO_SCENARIO_KEY;
  paperOnly: true;
  stepCount: number;
  approvedCount: number;
  rejectedCount: number;
  closedCount: number;
  openCount: number;
  manifest: DemoScenarioManifest;
};

export function buildDemoScenarioPayload(input: {
  stepCount: number;
  approvedCount: number;
  rejectedCount: number;
  closedCount: number;
  openCount: number;
  manifest: DemoScenarioManifest;
}): DemoScenarioPayload {
  return {
    demoScenarioKey: DEMO_SCENARIO_KEY,
    paperOnly: true,
    stepCount: input.stepCount,
    approvedCount: input.approvedCount,
    rejectedCount: input.rejectedCount,
    closedCount: input.closedCount,
    openCount: input.openCount,
    manifest: input.manifest,
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

/**
 * Defensively parses a demo_scenario_loaded audit row's payload back into a
 * DemoScenarioManifest. Returns null — never a partial/best-guess manifest —
 * for any payload that doesn't match the exact shape buildDemoScenarioPayload()
 * produces, so a malformed, hand-edited, or unexpectedly-shaped payload can
 * never be treated as "reset everything for this company."
 */
export function parseDemoManifest(payload: unknown): DemoScenarioManifest | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  if (record.demoScenarioKey !== DEMO_SCENARIO_KEY) return null;

  const manifest = record.manifest;
  if (typeof manifest !== "object" || manifest === null) return null;
  const m = manifest as Record<string, unknown>;

  if (typeof m.portfolioId !== "string" || m.portfolioId.length === 0) return null;
  if (!isStringArray(m.tradeIntentIds) || !isStringArray(m.paperPositionIds) || !isStringArray(m.auditEventIds)) return null;

  return {
    portfolioId: m.portfolioId,
    tradeIntentIds: m.tradeIntentIds,
    paperPositionIds: m.paperPositionIds,
    auditEventIds: m.auditEventIds,
  };
}

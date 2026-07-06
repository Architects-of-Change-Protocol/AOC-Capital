// ─── AOC Capital MVP Integration Review & Hardening (PR #22) ────────────────
// Source-Chain Integrity & Audit/Event Consistency ───────────────────────
// Cross-cutting checks over the reporting layer's source-chain and
// governance-evidence logic:
//   - strategy/signal/position attribution is never inferred from a symbol
//     match alone;
//   - the three reports that compute close-governance completeness
//     (closed performance, strategy attribution, signal cohorts) all use
//     the exact same audit event_type filter, and that filter requires the
//     PR #17 governed-close event (paper_position_closed), not the older
//     bare position_closed timeline label;
//   - deriveGovernanceEvidenceStatus treats "missing"/"partial"/"complete"
//     correctly and never backfills;
//   - a signal that was never converted is classified as not_advanced, not
//     broken/missing.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const CLOSED_PERF = fs.readFileSync("src/lib/capital/closed-position-performance-service.ts", "utf8");
const STRATEGY_ATTR = fs.readFileSync("src/lib/capital/strategy-performance-attribution-service.ts", "utf8");
const SIGNAL_COHORT = fs.readFileSync("src/lib/capital/signal-cohort-outcome-service.ts", "utf8");
const GOVERNANCE_SNAPSHOT = fs.readFileSync("src/lib/capital/portfolio-governance-snapshot-service.ts", "utf8");
const POSITION_DETAIL = fs.readFileSync("src/lib/capital/position-detail-service.ts", "utf8");

const GOVERNED_CLOSE_AUDIT_FILTER = /\.in\("event_type",\s*\[\s*"paper_position_close_review_approved",\s*"paper_position_closed"\s*\]\)/;

test("closed performance, strategy attribution, and signal cohort reports all use the identical governed-close audit event filter", () => {
  for (const [name, src] of [
    ["closed-position-performance-service.ts", CLOSED_PERF],
    ["strategy-performance-attribution-service.ts", STRATEGY_ATTR],
    ["signal-cohort-outcome-service.ts", SIGNAL_COHORT],
  ]) {
    assert.match(src, GOVERNED_CLOSE_AUDIT_FILTER, `${name} must filter close-governance audit events by the exact same event_type pair`);
  }
});

test("the governed-close audit filter requires paper_position_closed, not the legacy bare position_closed event, to count as closed-audit evidence", () => {
  for (const [name, src] of [
    ["closed-position-performance-service.ts", CLOSED_PERF],
    ["strategy-performance-attribution-service.ts", STRATEGY_ATTR],
    ["signal-cohort-outcome-service.ts", SIGNAL_COHORT],
  ]) {
    assert.match(src, /row\.event_type === "paper_position_closed"/, `${name} must key hasClosedAudit off paper_position_closed`);
    // A position with only a legacy `position_closed` audit event (and no `paper_position_closed`)
    // must not satisfy hasClosedAudit — confirm the bare event name is never treated as equivalent here.
    assert.doesNotMatch(src, /row\.event_type === "position_closed"/, `${name} must not treat legacy position_closed as governed-close evidence`);
  }
});

test("Position Detail's lifecycle timeline may treat position_closed and paper_position_closed as equivalent for display purposes only (a separate, documented concern from governance-completeness scoring)", () => {
  assert.match(POSITION_DETAIL, /\["position_closed",\s*"paper_position_closed"\]/);
});

test("deriveGovernanceEvidenceStatus is complete only when all three markers are present, missing only when none are, partial otherwise", async () => {
  const { deriveGovernanceEvidenceStatus } = await import("../src/lib/capital/closed-position-performance-service.ts");
  assert.equal(deriveGovernanceEvidenceStatus({ hasCloseReviewId: true, hasApprovedAudit: true, hasClosedAudit: true }), "complete");
  assert.equal(deriveGovernanceEvidenceStatus({ hasCloseReviewId: false, hasApprovedAudit: false, hasClosedAudit: false }), "missing");
  assert.equal(deriveGovernanceEvidenceStatus({ hasCloseReviewId: true, hasApprovedAudit: false, hasClosedAudit: false }), "partial");
  assert.equal(deriveGovernanceEvidenceStatus({ hasCloseReviewId: false, hasApprovedAudit: true, hasClosedAudit: true }), "partial");
});

test("closed performance never backfills evidence — historicalLegacyShapedCount is derived only from an absent close_review_id, never invented", () => {
  assert.match(CLOSED_PERF, /historicalLegacyShapedCount:\s*rows\.filter\(\(r\)\s*=>\s*!r\.closeReviewId\)\.length/);
});

// ─── No symbol-only attribution anywhere in the source-chain services ──────

const SYMBOL_ONLY_FORBIDDEN = [/cohortKey.*symbol/i, /deriveSignalCohortKey\([^)]*\bsymbol\b/, /positionByIntentId\.get\([^)]*symbol/i];

test("strategy attribution and signal cohort services never infer attribution from a symbol match alone", () => {
  for (const [name, src] of [
    ["strategy-performance-attribution-service.ts", STRATEGY_ATTR],
    ["signal-cohort-outcome-service.ts", SIGNAL_COHORT],
  ]) {
    for (const pattern of SYMBOL_ONLY_FORBIDDEN) {
      assert.doesNotMatch(src, pattern, `${name} must not infer attribution from symbol alone`);
    }
  }
});

test("strategy attribution resolves strategy source only via strategyProfileKey/signalStrategyKey, falling back to an explicit unlinked sentinel — never a symbol lookup", () => {
  assert.match(STRATEGY_ATTR, /UNLINKED_STRATEGY_KEY/);
  // Only a trade intent created through the governed signal-handoff RPC (source === "signal_recommendation",
  // set server-side in create_draft_trade_intent_from_signal_and_audit) is attributed back to a strategy via
  // its signal; a manually-created intent that merely references a client-supplied signalId (source === "signal")
  // is deliberately never attributed, since that link was never verified server-side.
  assert.match(STRATEGY_ATTR, /intent\.source\s*!==\s*"signal_recommendation"/);
});

// ─── not_advanced vs incomplete/unlinked vs historical distinctions exist ──

test("signal cohort outcomes track notConvertedSignals (not_advanced) as a distinct, non-penalized bucket from incompleteOutcomeCount", () => {
  assert.match(SIGNAL_COHORT, /notConvertedSignals/);
  assert.match(SIGNAL_COHORT, /incompleteOutcomeCount/);
});

test("portfolio governance snapshot explicitly distinguishes not_advanced, unlinked, and historical chains and never penalizes not-yet-advanced records", () => {
  assert.match(GOVERNANCE_SNAPSHOT, /not_advanced|notAdvanced|never penalized/i);
  assert.match(GOVERNANCE_SNAPSHOT, /unlinkedChains/);
  assert.match(GOVERNANCE_SNAPSHOT, /historicalChains/);
});

test("the historical_closed_positions governance gap is always informational (never a boundary violation), unlike missing close-review-id/close-audit gaps", () => {
  const gapBlock = GOVERNANCE_SNAPSHOT.match(/id:\s*"historical_closed_positions"[\s\S]{0,200}/)?.[0] ?? "";
  assert.match(gapBlock, /severity:\s*"info"/, "historical_closed_positions must always be severity info, never penalized as a defect");
});

test("closed positions missing close_review_id or missing close audit are surfaced as high-severity gaps only when their count is greater than zero", () => {
  assert.match(GOVERNANCE_SNAPSHOT, /severity:\s*input\.closedPositionsMissingCloseReviewId\s*>\s*0\s*\?\s*"high"\s*:\s*"info"/);
  assert.match(GOVERNANCE_SNAPSHOT, /severity:\s*input\.closedPositionsMissingCloseAudit\s*>\s*0\s*\?\s*"high"\s*:\s*"info"/);
});

// ─── Reporting services never create/write audit records, only read them ──

test("closed performance, strategy attribution, and signal cohort services only ever select from audit_ledger, never write to it", () => {
  for (const [name, src] of [
    ["closed-position-performance-service.ts", CLOSED_PERF],
    ["strategy-performance-attribution-service.ts", STRATEGY_ATTR],
    ["signal-cohort-outcome-service.ts", SIGNAL_COHORT],
  ]) {
    assert.doesNotMatch(src, /\.from\(\s*"audit_ledger"\s*\)[\s\S]{0,80}?\.(insert|update|delete|upsert)\(/, `${name} must not write audit_ledger`);
  }
});

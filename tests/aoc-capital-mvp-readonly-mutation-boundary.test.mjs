// ─── AOC Capital MVP Integration Review & Hardening (PR #22) ────────────────
// Read-Only vs Mutation Boundary ──────────────────────────────────────────
// Cross-cutting static check over every canonical read-only reporting
// service: none of them may import or call a mutation service/RPC, write a
// table directly, refresh market data, or call an LLM. Each of these
// services already has its own dedicated `*-safety.test.mjs`; this file
// asserts the same boundary across all of them at once so a new reporting
// surface can't be added without inheriting the same guarantee.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const READ_ONLY_REPORTING_SERVICES = [
  "src/lib/capital/portfolio-overview-service.ts",
  "src/lib/capital/allocation-exposure-service.ts",
  "src/lib/capital/position-detail-service.ts",
  "src/lib/capital/closed-position-performance-service.ts",
  "src/lib/capital/strategy-performance-attribution-service.ts",
  "src/lib/capital/signal-cohort-outcome-service.ts",
  "src/lib/capital/portfolio-governance-snapshot-service.ts",
];

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

// Code with `//` and `/* */` comments stripped, so a doc comment merely
// *naming* a forbidden function (to explain what the module deliberately
// avoids) can't produce a false positive — only an actual call site fails
// these checks.
const sourcesByFile = new Map(READ_ONLY_REPORTING_SERVICES.map((f) => [f, stripComments(fs.readFileSync(f, "utf8"))]));

test("every canonical read-only reporting service file exists", () => {
  for (const file of READ_ONLY_REPORTING_SERVICES) {
    assert.ok(fs.existsSync(file), `expected service file to exist: ${file}`);
  }
});

const FORBIDDEN_MUTATION_HELPERS =
  /\bgenerateSignals\(|\bgeneratePaperSignalRecommendations\(|\bconvertSignalToDraftTradeIntent\(|\bcreateDraftTradeIntentFromSignal\(|\bsubmitDraftTradeIntentForReview\(|\bcancelDraftTradeIntent\(|\brequestPaperPositionCloseReview\(|\bclosePaperPosition\(|\bmarkAllOpenPositions\(|\bmarkPositionToMarket\(|\brecordMarketPrice\(|\bcreateTradeIntent\(|\bselectStrategy\(|\brecordAuditEvent\(|\blistPaperPositionsMarked\(|\bloadPortfolioOverview\(/;

const FORBIDDEN_MUTATION_RPCS = [
  "create_draft_trade_intent_from_signal_and_audit",
  "submit_draft_trade_intent_for_review",
  "cancel_draft_trade_intent_and_audit",
  "evaluate_and_record_trade_intent",
  "insert_paper_signal_recommendations_and_audit",
  "select_portfolio_strategy_profile_and_audit",
  "mark_paper_position",
  "mark_all_open_paper_positions",
  "close_paper_position",
  "close_paper_position_with_review_and_audit",
];

test("no read-only reporting service calls a forbidden mutation helper function", () => {
  for (const [file, src] of sourcesByFile) {
    assert.doesNotMatch(src, FORBIDDEN_MUTATION_HELPERS, `${file} must not call a mutation helper`);
  }
});

test("no read-only reporting service calls any governed mutation RPC by name", () => {
  for (const [file, src] of sourcesByFile) {
    for (const rpc of FORBIDDEN_MUTATION_RPCS) {
      assert.doesNotMatch(src, new RegExp(rpc), `${file} must not call RPC ${rpc}`);
    }
  }
});

test("no read-only reporting service calls .rpc( at all", () => {
  for (const [file, src] of sourcesByFile) {
    assert.doesNotMatch(src, /\.rpc\(/, `${file} must not call any RPC`);
  }
});

test("no read-only reporting service inserts, updates, upserts, or deletes any table directly", () => {
  const TABLES = [
    "paper_positions",
    "paper_position_close_reviews",
    "trade_intents",
    "trade_decisions",
    "portfolio_strategy_profiles",
    "paper_signal_recommendations",
    "audit_ledger",
    "portfolios",
  ];
  for (const [file, src] of sourcesByFile) {
    for (const table of TABLES) {
      assert.doesNotMatch(
        src,
        new RegExp(`\\.from\\(\\s*"${table}"\\s*\\)[\\s\\S]{0,80}?\\.(insert|update|delete|upsert)\\(`),
        `${file} must not write ${table} directly`
      );
    }
  }
});

test("no read-only reporting service refreshes market data or fetches a live price", () => {
  for (const [file, src] of sourcesByFile) {
    assert.doesNotMatch(src, /recordMarketPrice\(|fetchLivePrice\(|refreshMarketData\(|generateMockPrice\(/, `${file} must not refresh market data`);
  }
});

test("no read-only reporting service calls an LLM", () => {
  for (const [file, src] of sourcesByFile) {
    assert.doesNotMatch(src, /callCapitalLLM\(|invokeLLM\(|anthropic\.messages\.create|openai\./i, `${file} must not call an LLM`);
  }
});

test("no read-only reporting service writes an audit event", () => {
  for (const [file, src] of sourcesByFile) {
    assert.doesNotMatch(src, /recordAuditEvent\(/, `${file} must not write an audit event`);
  }
});

// ─── Reporting pages never render a mutation form/button ───────────────────

const READ_ONLY_PAGES = [
  "src/app/(protected)/capital/overview/page.tsx",
  "src/app/(protected)/capital/allocation/page.tsx",
  "src/app/(protected)/capital/positions/[id]/page.tsx",
  "src/app/(protected)/capital/performance/closed/page.tsx",
  "src/app/(protected)/capital/performance/strategies/page.tsx",
  "src/app/(protected)/capital/performance/signals/page.tsx",
  "src/app/(protected)/capital/governance/snapshot/page.tsx",
];

const FORBIDDEN_MUTATION_ACTION_LABEL =
  />\s*Close Position\s*</i;

test("read-only pages never render a form (client-side mutation surface)", () => {
  for (const page of READ_ONLY_PAGES) {
    const src = fs.readFileSync(page, "utf8");
    assert.doesNotMatch(src, /<form\b/, `${page} must not render a form`);
  }
});

test("read-only pages never render an unguarded 'Close Position' action label", () => {
  for (const page of READ_ONLY_PAGES) {
    const src = fs.readFileSync(page, "utf8");
    assert.doesNotMatch(src, FORBIDDEN_MUTATION_ACTION_LABEL, `${page} must not render a Close Position action`);
  }
});

test("read-only pages never import a mutation-button component from another capital flow", () => {
  const FORBIDDEN_COMPONENTS =
    /GenerateSignalsButton|ConvertSignalToDraftButton|CancelDraftButton|SubmitDraftForReviewButton|StrategySelectButton|MarkAllButton\b(?!.*RequestPaperCloseReviewButton)/;
  for (const page of READ_ONLY_PAGES) {
    const src = fs.readFileSync(page, "utf8");
    // Position Detail legitimately renders RequestPaperCloseReviewButton (its one governed action); exclude it from the generic component check.
    const withoutOwnGovernedButton = src.replace(/RequestPaperCloseReviewButton/g, "");
    assert.doesNotMatch(withoutOwnGovernedButton, FORBIDDEN_COMPONENTS, `${page} must not import an unrelated mutation button`);
  }
});

// Position Detail is the one "read-only" page permitted to render exactly
// one governed mutation entry point (request close review) — verify it
// does not also render any of the other mutation buttons.
test("Position Detail renders only the governed request-close-review action, no other mutation button", () => {
  const src = fs.readFileSync("src/app/(protected)/capital/positions/[id]/page.tsx", "utf8");
  assert.doesNotMatch(src, /MarkAllButton|PositionActions|GenerateSignalsButton|ConvertSignalToDraftButton|CancelDraftButton|SubmitDraftForReviewButton|StrategySelectButton/);
});

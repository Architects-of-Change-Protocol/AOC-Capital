// ─── AOC Capital MVP Polish & Navigation Consolidation (PR #23) ─────────────
// Empty State Consistency ─────────────────────────────────────────────────
// Every empty-state string across the canonical reporting content modules
// must use paper/simulated language, must never use trading/execution
// language, and must never direct the user toward a mutation action.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const CONTENT_MODULES_WITH_EMPTY_STATES = [
  "src/lib/capital/portfolio-overview-content.ts",
  "src/lib/capital/allocation-exposure-content.ts",
  "src/lib/capital/closed-position-performance-content.ts",
  "src/lib/capital/strategy-performance-attribution-content.ts",
  "src/lib/capital/signal-cohort-outcome-content.ts",
  "src/lib/capital/portfolio-governance-snapshot-content.ts",
  "src/lib/capital/position-detail-content.ts",
];

function extractEmptyStateStrings(source) {
  const matches = [...source.matchAll(/export const (EMPTY_\w+)\s*=\s*"([^"]*)"/g)];
  return matches.map((m) => ({ name: m[1], value: m[2] }));
}

test("every expected content module with empty states exists", () => {
  for (const file of CONTENT_MODULES_WITH_EMPTY_STATES) {
    assert.ok(fs.existsSync(file), `expected content module to exist: ${file}`);
  }
});

test("at least one EMPTY_* empty-state string was found across the reporting content modules", () => {
  let total = 0;
  for (const file of CONTENT_MODULES_WITH_EMPTY_STATES) {
    const src = fs.readFileSync(file, "utf8");
    total += extractEmptyStateStrings(src).length;
  }
  assert.ok(total > 5, `expected several EMPTY_* empty-state strings, found ${total}`);
});

const FORBIDDEN_EMPTY_STATE_LANGUAGE = [
  /\bstart trading\b/i,
  /\bbuy now\b/i,
  /\bsell now\b/i,
  /\bexecute\b/i,
  /\bplace order\b/i,
  /\bconnect broker\b/i,
  /\bdeposit funds\b/i,
  /\btrade now\b/i,
];

test("no empty-state string uses trading/execution/broker/deposit language", () => {
  for (const file of CONTENT_MODULES_WITH_EMPTY_STATES) {
    const src = fs.readFileSync(file, "utf8");
    for (const { name, value } of extractEmptyStateStrings(src)) {
      for (const pattern of FORBIDDEN_EMPTY_STATE_LANGUAGE) {
        assert.doesNotMatch(value, pattern, `${file}: ${name} ("${value}") must not match ${pattern}`);
      }
    }
  }
});

test("every page with an empty state also carries page-level paper-only framing (PAGE_SUBTITLE or GOVERNANCE_BADGES)", () => {
  // Individual empty-state strings don't each need to restate "paper" — the
  // page header/badges already carry that framing site-wide (see
  // aoc-capital-mvp-page-header-consistency.test.mjs) — but the module as a
  // whole must not present empty states in total isolation from that framing.
  for (const file of CONTENT_MODULES_WITH_EMPTY_STATES) {
    const src = fs.readFileSync(file, "utf8");
    const hasEmptyState = extractEmptyStateStrings(src).length > 0;
    if (!hasEmptyState) continue;
    assert.match(src, /GOVERNANCE_BADGES|PAGE_SUBTITLE/, `${file} must pair empty states with page-level paper-only framing`);
  }
});

test("empty states never suggest a mutation CTA (Generate, Convert, Submit, Close, Buy, Sell) as the next step", () => {
  const FORBIDDEN_CTA = /\b(generate signals now|convert this signal|submit for review here|close this position|buy this|sell this)\b/i;
  for (const file of CONTENT_MODULES_WITH_EMPTY_STATES) {
    const src = fs.readFileSync(file, "utf8");
    for (const { name, value } of extractEmptyStateStrings(src)) {
      assert.doesNotMatch(value, FORBIDDEN_CTA, `${file}: ${name} ("${value}") must not suggest a mutation CTA`);
    }
  }
});

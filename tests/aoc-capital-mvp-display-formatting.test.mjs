// ─── AOC Capital MVP Polish & Navigation Consolidation (PR #23) ─────────────
// Display Formatting Consistency ─────────────────────────────────────────
// Pure-function tests over the shared capital display-formatting helpers:
// null/undefined/NaN render as "Not available", zero renders as zero (never
// treated as missing), and percentages/currency use consistent precision.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const {
  NOT_AVAILABLE,
  formatCurrencyOrUnavailable,
  formatPercentOrUnavailable,
  formatNumberOrUnavailable,
  formatDateOrUnavailable,
  formatStatusLabel,
  formatEvidenceStatus,
  formatReadinessStatus,
} = await import("../src/lib/capital/capital-display-formatters.ts");

test("NOT_AVAILABLE is a stable, non-empty sentinel string", () => {
  assert.equal(NOT_AVAILABLE, "Not available");
});

for (const [name, fn] of [
  ["formatCurrencyOrUnavailable", formatCurrencyOrUnavailable],
  ["formatPercentOrUnavailable", formatPercentOrUnavailable],
  ["formatNumberOrUnavailable", formatNumberOrUnavailable],
]) {
  test(`${name}: null -> Not available`, () => {
    assert.equal(fn(null), NOT_AVAILABLE);
  });
  test(`${name}: undefined -> Not available`, () => {
    assert.equal(fn(undefined), NOT_AVAILABLE);
  });
  test(`${name}: NaN -> Not available`, () => {
    assert.equal(fn(NaN), NOT_AVAILABLE);
  });
  test(`${name}: zero is formatted as zero, not treated as missing`, () => {
    const formatted = fn(0);
    assert.notEqual(formatted, NOT_AVAILABLE);
  });
}

test("formatDateOrUnavailable: null/undefined/empty string -> Not available", () => {
  assert.equal(formatDateOrUnavailable(null), NOT_AVAILABLE);
  assert.equal(formatDateOrUnavailable(undefined), NOT_AVAILABLE);
  assert.equal(formatDateOrUnavailable(""), NOT_AVAILABLE);
});

test("formatDateOrUnavailable: invalid date string -> Not available", () => {
  assert.equal(formatDateOrUnavailable("not-a-date"), NOT_AVAILABLE);
});

test("formatDateOrUnavailable: valid ISO date string formats to a non-empty, different string", () => {
  const formatted = formatDateOrUnavailable("2026-01-01T00:00:00.000Z");
  assert.ok(formatted.length > 0);
  assert.notEqual(formatted, NOT_AVAILABLE);
});

test("formatCurrencyOrUnavailable: uses two-decimal precision by default", () => {
  assert.equal(formatCurrencyOrUnavailable(1234.5), "$1234.50");
});

test("formatCurrencyOrUnavailable: accepts a custom currency prefix", () => {
  assert.equal(formatCurrencyOrUnavailable(10, "€"), "€10.00");
});

test("formatPercentOrUnavailable: converts a ratio to a percentage with two-decimal precision by default", () => {
  assert.equal(formatPercentOrUnavailable(0.4567), "45.67%");
});

test("formatStatusLabel: null/undefined -> Not available", () => {
  assert.equal(formatStatusLabel(null), NOT_AVAILABLE);
  assert.equal(formatStatusLabel(undefined), NOT_AVAILABLE);
});

test("formatStatusLabel: snake_case is converted to Title Case", () => {
  assert.equal(formatStatusLabel("review_needed"), "Review Needed");
});

test("formatEvidenceStatus and formatReadinessStatus fall back to Not available on missing input", () => {
  assert.equal(formatEvidenceStatus(null), NOT_AVAILABLE);
  assert.equal(formatReadinessStatus(undefined), NOT_AVAILABLE);
});

test("formatEvidenceStatus formats a known status value", () => {
  assert.equal(formatEvidenceStatus("complete"), "Complete");
});

// ─── The formatter module is pure metadata/formatting: no mutation surface ──

test("capital-display-formatters.ts calls no service, RPC, or mutation helper", () => {
  const src = fs.readFileSync("src/lib/capital/capital-display-formatters.ts", "utf8");
  assert.doesNotMatch(src, /\.rpc\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|createSupabaseServerClient|fetch\(/);
});

// ─── The formatter module is actually used somewhere, not dead code ────────

test("at least one capital page imports and uses the shared display formatters", () => {
  const src = fs.readFileSync("src/app/(protected)/capital/capital-levels/page.tsx", "utf8");
  assert.match(src, /from\s+"@\/lib\/capital\/capital-display-formatters"/);
});

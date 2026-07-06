// ─── AOC Capital MVP Integration Review & Hardening (PR #22) ────────────────
// UI Copy Safety ──────────────────────────────────────────────────────────
// Cross-cutting static check over every user-facing AOC Capital page/
// component: no forbidden execution/advice/live-trading-readiness copy is
// rendered, and the required paper-only / real-execution-locked safety
// framing is present on the governance-relevant pages. Per-feature
// `*-ui.test.mjs` files already check individual pages in depth; this file
// sweeps every page at once so a new page can't slip through without the
// same baseline check.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function walk(dir, exts) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((ext) => entry.name.endsWith(ext))) out.push(full);
  }
  return out;
}

const CAPITAL_UI_FILES = walk("src/app/(protected)/capital", [".tsx"]);

// Strips `//` and `/* */` comments so a doc comment explaining a safety
// boundary in prose (e.g. citing the one legitimate "Request Paper Close
// Review" action by name) can't be mistaken for that action being rendered.
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

test("capital UI files were discovered", () => {
  assert.ok(CAPITAL_UI_FILES.length > 20, `expected many capital page/component files, found ${CAPITAL_UI_FILES.length}`);
});

// Forbidden copy: real affirmative execution/advice/readiness language. Each
// pattern is deliberately written so it does NOT match the allowed negation
// forms ("No real order was placed", "Real execution remains locked",
// "brokerConnected: false", etc.) — negations are a required safety pattern,
// not a violation.
const FORBIDDEN_COPY_PATTERNS = [
  { name: "Execute (as an action label)", pattern: />\s*Execute\s*</ },
  { name: "Place Order", pattern: /Place\s+Order/i },
  { name: "Trade Now", pattern: /Trade\s+Now/i },
  { name: "Buy Now / Sell Now (as a CTA)", pattern: />\s*(Buy|Sell)\s+Now\s*</i },
  { name: "Send to Broker", pattern: /Send\s+to\s+Broker/i },
  { name: "Connect Exchange", pattern: /Connect\s+Exchange/i },
  { name: "Fund account", pattern: /Fund\s+account/i },
  { name: "Deposit (as an action)", pattern: />\s*Deposit\s*</i },
  { name: "Withdraw (as an action, not 'withdraws the draft')", pattern: />\s*Withdraw\s*</i },
  { name: "Refresh Valuation", pattern: /Refresh\s+Valuation/i },
  { name: "Recommended strategy", pattern: /[Rr]ecommended\s+strategy/ },
  { name: "Best signal", pattern: /[Bb]est\s+signal/ },
  { name: "Best strategy", pattern: /[Bb]est\s+strategy/ },
  // Deliberately excludes the "Investment advice provided: {fmtBool(...)}" governance-flag
  // label pattern used throughout the reporting suite (same shape as "Broker connected: false") —
  // that's a data-driven safety flag display, not an affirmative advice claim.
  { name: "Investment advice (affirmative)", pattern: /\b(?:provides?|constitutes|offers?)\s+investment\s+advice\b|\bthis\s+is\s+investment\s+advice\b/i },
  { name: "Real trading ready", pattern: /[Rr]eal\s+trading\s+ready/ },
  { name: "Broker ready", pattern: /[Bb]roker\s+ready/ },
  { name: "Live execution ready", pattern: /[Ll]ive\s+execution\s+ready/ },
  { name: "Execution ready", pattern: /[Ee]xecution\s+ready/ },
  { name: "Alpha (as a marketing claim)", pattern: /\balpha\s+generation\b|\bgenerates?\s+alpha\b/i },
];

test("no capital UI file renders forbidden execution/advice/readiness copy", () => {
  for (const file of CAPITAL_UI_FILES) {
    const src = fs.readFileSync(file, "utf8");
    for (const { name, pattern } of FORBIDDEN_COPY_PATTERNS) {
      assert.doesNotMatch(src, pattern, `${file} must not render forbidden copy: ${name}`);
    }
  }
});

// The one legitimate governed exception: Position Detail may render "Request
// Paper Close Review" (the one governed mutation action for a read-only-
// looking detail page) — verify no OTHER page renders it.
test("only Position Detail renders a close-review request action", () => {
  for (const file of CAPITAL_UI_FILES) {
    if (file.includes("positions/[id]") || file.includes("request-paper-close-review-button")) continue;
    const src = stripComments(fs.readFileSync(file, "utf8"));
    assert.doesNotMatch(src, /Request\s+(Paper\s+)?Close\s+Review/i, `${file} must not render a close-review request action`);
  }
});

// ─── Required safety copy present where expected ────────────────────────────

const GOVERNANCE_PAGES_REQUIRING_SAFETY_COPY = [
  "src/app/(protected)/capital/overview/page.tsx",
  "src/app/(protected)/capital/governance/snapshot/page.tsx",
  "src/app/(protected)/capital/market-data/page.tsx",
  "src/app/(protected)/capital/advisor/page.tsx",
  "src/app/(protected)/capital/demo/page.tsx",
];

test("governance-relevant pages carry paper-only / real-execution-locked / no-broker safety framing", () => {
  for (const page of GOVERNANCE_PAGES_REQUIRING_SAFETY_COPY) {
    const src = fs.readFileSync(page, "utf8");
    assert.match(src, /[Pp]aper[\s-]only|[Ss]imulat/i, `${page} must carry paper-only/simulation framing`);
    assert.match(src, /broker/i, `${page} must reference broker connection status`);
  }
});

test("the capital layout shell states the governed, paper-only, real-execution-locked framing", () => {
  const src = fs.readFileSync("src/app/(protected)/capital/layout.tsx", "utf8");
  assert.match(src, /[Ss]imulated,?\s+governed\s+trading/i);
  assert.match(src, /No\s+real\s+exchange\s+execution\s+is\s+connected/i);
});

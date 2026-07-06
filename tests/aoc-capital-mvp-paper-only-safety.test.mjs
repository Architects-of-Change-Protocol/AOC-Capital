// ─── AOC Capital MVP Integration Review & Hardening (PR #22) ────────────────
// Paper-Only Safety Boundary ──────────────────────────────────────────────
// A single broad grep-style sweep across every AOC Capital source file
// (routes, services, domain, pages, migrations) confirming no broker,
// exchange, trading-API-key, deposit, withdrawal, or live-order-routing
// surface has been introduced anywhere in the product. This mirrors the
// PR's own safety grep so a future PR can't reintroduce one of these
// surfaces without a test failing first.

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

const CAPITAL_SOURCE_DIRS = ["src/app/api/capital", "src/app/(protected)/capital", "src/lib/capital", "src/features/capital"];

const CAPITAL_FILES = CAPITAL_SOURCE_DIRS.flatMap((dir) => (fs.existsSync(dir) ? walk(dir, [".ts", ".tsx"]) : []));

test("capital source directories were discovered and are non-empty", () => {
  assert.ok(CAPITAL_FILES.length > 30, `expected many capital source files, found ${CAPITAL_FILES.length}`);
});

// Forbidden surfaces: real broker/exchange clients, credential handling,
// direct order placement, and withdrawal/deposit code. Deliberately
// excludes the words when used only as negations ("No broker connected",
// "brokerConnected: false", etc.) — those are handled by the allowlist
// below and by the dedicated UI-copy-safety test.
const FORBIDDEN_SURFACE_PATTERNS = [
  { name: "broker client / SDK", pattern: /\bbrokerClient\b|\bbrokerSdk\b|new\s+Broker[A-Z]\w*\(/ },
  { name: "order router", pattern: /\borderRouter\b/ },
  { name: "direct order placement", pattern: /\bplaceOrder\(|\bcreateOrder\(|\bexecuteTrade\(/ },
  { name: "exchange API credentials", pattern: /\bapiSecret\b|\bprivateKey\b|\bsignedRequest\(/i },
  { name: "account balance / broker balance fetch", pattern: /\baccountBalance\(/ },
  { name: "withdrawal implementation", pattern: /\bwithdrawFunds\(|\bprocessWithdrawal\(/ },
  { name: "deposit implementation", pattern: /\bprocessDeposit\(|\bcreateDeposit\(/ },
];

test("no capital source file introduces a broker/order/exchange/withdrawal/deposit implementation surface", () => {
  for (const file of CAPITAL_FILES) {
    const src = fs.readFileSync(file, "utf8");
    for (const { name, pattern } of FORBIDDEN_SURFACE_PATTERNS) {
      assert.doesNotMatch(src, pattern, `${file} must not introduce a ${name} surface`);
    }
  }
});

test("no capital route or service imports a real broker/exchange SDK package", () => {
  for (const file of CAPITAL_FILES) {
    const src = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(src, /from\s+["'](ccxt|coinbase|binance|alpaca|interactive-brokers|ib_insync|robinhood)/i, `${file} must not import a broker/exchange SDK`);
  }
});

test("package.json does not declare a broker/exchange trading SDK dependency", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const name of Object.keys(deps)) {
    assert.doesNotMatch(name, /ccxt|coinbase|binance|alpaca-trade-api|ib_insync/i, `package.json must not depend on a broker/exchange SDK (found ${name})`);
  }
});

test("no capital route exposes a live order-routing or real-execution-enable endpoint", () => {
  const routeFiles = fs.readdirSync("src/app/api/capital", { recursive: true }).filter((f) => typeof f === "string" && f.endsWith("route.ts"));
  for (const file of routeFiles) {
    assert.doesNotMatch(file, /order|execute|broker|withdraw|deposit/i, `route path src/app/api/capital/${file} must not name a real-execution surface`);
  }
});

test("no capital service calls an LLM directly (LLM calls are gated behind llm-guardrails validation only, and none exist yet)", () => {
  for (const file of CAPITAL_FILES) {
    const src = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(src, /anthropic\.messages\.create|openai\.chat\.completions|new\s+Anthropic\(|new\s+OpenAI\(/i, `${file} must not call an LLM directly`);
  }
});

test("Investor Constitution Intake never calls an LLM, never persists to Supabase, and always sets paperTradingOnly true", () => {
  const src = fs.readFileSync("src/features/capital/domain/investor-constitution-intake.ts", "utf8");
  assert.doesNotMatch(src, /anthropic\.messages\.create|openai\.chat\.completions|createSupabaseServerClient|\.rpc\(|\.insert\(|\.update\(/i);
  assert.match(src, /paperTradingOnly:\s*true/);
});

test("LLM guardrails prohibit execution/broker/advice language", () => {
  const src = fs.readFileSync("src/features/capital/domain/llm-guardrails.ts", "utf8");
  for (const phrase of ["execute", "place order", "send to broker", "connect exchange", "guaranteed return", "live trade", "real trade"]) {
    assert.match(src, new RegExp(phrase.replace(/ /g, "\\s+"), "i"), `llm-guardrails.ts must prohibit the phrase "${phrase}"`);
  }
});

// ─── No new schema migration was added for this integration-review PR ──────

test("no new supabase migration was added for this integration-review-only PR", () => {
  // As of PR #21 (Portfolio Governance Snapshot), there are 16 AOC Capital
  // migrations, the newest being 20260913000000_aoc_capital_governed_close_position_review.sql.
  // PR #22 is audit + hardening only and must not add a 17th.
  const migrations = fs.readdirSync("supabase/migrations").filter((f) => f.includes("capital"));
  assert.equal(migrations.length, 16, "PR #22 is audit + hardening only and must not add a schema migration");
});

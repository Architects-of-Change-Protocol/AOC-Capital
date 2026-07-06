// ─── AOC Capital MVP Integration Review & Hardening (PR #22) ────────────────
// Tenant/Company & Portfolio Scoping ──────────────────────────────────────
// Cross-cutting static check that every portfolio-level query in every
// capital service scopes by company_id, and — for tables that carry a
// portfolio_id column — also scopes by portfolio_id. audit_ledger has no
// portfolio_id column, so it is checked for company_id scoping only.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const CAPITAL_SERVICE_FILES = fs
  .readdirSync("src/lib/capital")
  .filter((f) => f.endsWith("-service.ts"))
  .map((f) => `src/lib/capital/${f}`);

test("at least the expected read-only and mutation service files were discovered", () => {
  assert.ok(CAPITAL_SERVICE_FILES.length >= 10, `expected many capital service files, found ${CAPITAL_SERVICE_FILES.length}`);
});

// Tables that carry both company_id and portfolio_id columns.
const PORTFOLIO_SCOPED_TABLES = ["paper_positions", "trade_intents", "paper_signal_recommendations", "paper_position_close_reviews"];

// Tables that are company-scoped only (no portfolio_id column in this MVP's single-portfolio-per-company model).
const COMPANY_ONLY_SCOPED_TABLES = ["trade_decisions", "audit_ledger", "portfolios", "risk_constitution_rules", "capital_levels", "portfolio_strategy_profiles"];

function extractQueriesAgainst(src, table) {
  const pattern = new RegExp(`\\.from\\("${table}"\\)[\\s\\S]*?;`, "g");
  return src.match(pattern) ?? [];
}

test("every query against a portfolio-scoped table filters by both company_id and portfolio_id", () => {
  let checkedAny = false;
  for (const file of CAPITAL_SERVICE_FILES) {
    const src = fs.readFileSync(file, "utf8");
    for (const table of PORTFOLIO_SCOPED_TABLES) {
      const queries = extractQueriesAgainst(src, table);
      for (const query of queries) {
        checkedAny = true;
        assert.match(query, /\.eq\("company_id",\s*companyId\)/, `${file}: query against ${table} must scope by company_id: ${query.slice(0, 100)}`);
        assert.match(query, /\.eq\("portfolio_id",\s*portfolioId\)/, `${file}: query against ${table} must scope by portfolio_id: ${query.slice(0, 100)}`);
      }
    }
  }
  assert.ok(checkedAny, "expected to find at least one portfolio-scoped query across capital services");
});

test("every query against a company-only-scoped table filters by company_id", () => {
  let checkedAny = false;
  for (const file of CAPITAL_SERVICE_FILES) {
    const src = fs.readFileSync(file, "utf8");
    for (const table of COMPANY_ONLY_SCOPED_TABLES) {
      const queries = extractQueriesAgainst(src, table);
      for (const query of queries) {
        checkedAny = true;
        assert.match(query, /\.eq\("company_id",\s*companyId\)/, `${file}: query against ${table} must scope by company_id: ${query.slice(0, 100)}`);
      }
    }
  }
  assert.ok(checkedAny, "expected to find at least one company-scoped query across capital services");
});

test("no capital service resolves a portfolio-level record by id alone without a company_id filter in the same query", () => {
  for (const file of CAPITAL_SERVICE_FILES) {
    const src = fs.readFileSync(file, "utf8");
    for (const table of [...PORTFOLIO_SCOPED_TABLES, ...COMPANY_ONLY_SCOPED_TABLES]) {
      // Any query that filters `.eq("id", ...)` against one of these tables must also carry a company_id filter in the same statement.
      const idOnlyPattern = new RegExp(`\\.from\\("${table}"\\)(?:(?!\\.eq\\("company_id")[\\s\\S]){0,300}?\\.eq\\("id",`, "g");
      const matches = src.match(idOnlyPattern) ?? [];
      for (const m of matches) {
        assert.fail(`${file}: found a query against ${table} filtering by id before any company_id filter — possible cross-tenant lookup: ${m.slice(-140)}`);
      }
    }
  }
});

// company_id origin: every route resolves companyId from the authenticated
// user, never from a client-supplied query/body field.
test("no capital API route accepts a client-supplied companyId or portfolioId override", () => {
  const routeFiles = fs.readdirSync("src/app/api/capital", { recursive: true }).filter((f) => typeof f === "string" && f.endsWith("route.ts"));
  for (const file of routeFiles) {
    const src = fs.readFileSync(`src/app/api/capital/${file}`, "utf8");
    assert.doesNotMatch(src, /body\.companyId|body\.portfolioId|searchParams\.get\("companyId"\)|searchParams\.get\("portfolioId"\)/, `src/app/api/capital/${file} must not accept a client-supplied company/portfolio id`);
  }
});

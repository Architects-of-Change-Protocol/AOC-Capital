// ─── AOC Capital MVP Polish & Navigation Consolidation (PR #23) ─────────────
// Related Links Consistency ───────────────────────────────────────────────
// Checks the shared related-links map (CAPITAL_RELATED_LINKS) resolves to
// real routes, key reporting pages link to Governance Snapshot, performance
// pages interlink safely, Position Detail links to the expected reporting
// pages, and no <Link> rendered anywhere under the capital app uses a
// mutation-flavored action label (Execute, Buy, Sell, Close, Convert, Submit).

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const { CAPITAL_RELATED_LINKS, CAPITAL_ROUTE_METADATA, SAFE_LINK_LABELS, getCapitalRelatedLinks } = await import(
  "../src/lib/capital/capital-navigation.ts"
);

const routeKeys = new Set(CAPITAL_ROUTE_METADATA.map((r) => r.key));

test("every related-link entry resolves to a real, known route key", () => {
  for (const [pageKey, relatedKeys] of Object.entries(CAPITAL_RELATED_LINKS)) {
    assert.ok(routeKeys.has(pageKey), `related-links source page "${pageKey}" must be a known route key`);
    for (const relatedKey of relatedKeys) {
      assert.ok(routeKeys.has(relatedKey), `related link "${relatedKey}" on "${pageKey}" must be a known route key`);
    }
  }
});

test("getCapitalRelatedLinks never returns fewer resolved routes than requested keys", () => {
  for (const pageKey of Object.keys(CAPITAL_RELATED_LINKS)) {
    const resolved = getCapitalRelatedLinks(pageKey);
    assert.equal(resolved.length, CAPITAL_RELATED_LINKS[pageKey].length, `all related links for ${pageKey} must resolve`);
  }
});

const REPORTING_PAGES_MUST_LINK_GOVERNANCE = ["portfolioOverview", "allocationExposure", "closedPerformance", "strategyAttribution", "signalCohorts", "paperPositions"];

test("key reporting pages link to Governance Snapshot", () => {
  for (const pageKey of REPORTING_PAGES_MUST_LINK_GOVERNANCE) {
    assert.ok(CAPITAL_RELATED_LINKS[pageKey]?.includes("governanceSnapshot"), `${pageKey} must link to governanceSnapshot`);
  }
});

test("performance pages interlink safely with each other", () => {
  assert.ok(CAPITAL_RELATED_LINKS.closedPerformance.includes("strategyAttribution"));
  assert.ok(CAPITAL_RELATED_LINKS.closedPerformance.includes("signalCohorts"));
  assert.ok(CAPITAL_RELATED_LINKS.strategyAttribution.includes("closedPerformance"));
  assert.ok(CAPITAL_RELATED_LINKS.strategyAttribution.includes("signalCohorts"));
  assert.ok(CAPITAL_RELATED_LINKS.signalCohorts.includes("closedPerformance"));
  assert.ok(CAPITAL_RELATED_LINKS.signalCohorts.includes("strategyAttribution"));
});

test("Position Detail links to the expected reporting pages", () => {
  const expected = ["paperPositions", "allocationExposure", "closedPerformance", "strategyAttribution", "signalCohorts", "governanceSnapshot"];
  for (const key of expected) {
    assert.ok(CAPITAL_RELATED_LINKS.positionDetail.includes(key), `positionDetail must link to ${key}`);
  }
});

const FORBIDDEN_ACTION_WORDS = [/\bExecute\b/i, /\bBuy\b/i, /\bSell\b/i, /\bClose\b/i, /\bConvert\b/i, /\bSubmit\b/i];

test("no safe link label uses a mutation action verb", () => {
  for (const label of Object.values(SAFE_LINK_LABELS)) {
    for (const pattern of FORBIDDEN_ACTION_WORDS) {
      assert.doesNotMatch(label, pattern, `safe link label "${label}" must not match ${pattern}`);
    }
  }
});

// ─── No <Link> rendered under the capital app ever uses an action verb ─────
// (Actual mutation entry points in this codebase are <button>-based client
// components, never <Link>, so this check cannot collide with a legitimate
// governed action like "Submit for Risk Constitution Review".)

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

function extractLinkTexts(source) {
  const matches = [...source.matchAll(/<Link\b[^>]*>([\s\S]*?)<\/Link>/g)];
  return matches.map((m) => m[1].replace(/\{[^}]*\}/g, " ").replace(/\s+/g, " ").trim());
}

test("no <Link> label anywhere in the capital app uses a mutation action verb", () => {
  for (const file of CAPITAL_UI_FILES) {
    const src = fs.readFileSync(file, "utf8");
    for (const text of extractLinkTexts(src)) {
      for (const pattern of FORBIDDEN_ACTION_WORDS) {
        assert.doesNotMatch(text, pattern, `${file}: link text "${text}" must not match ${pattern}`);
      }
    }
  }
});

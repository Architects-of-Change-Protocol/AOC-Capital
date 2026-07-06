// ─── AOC Capital MVP Polish & Navigation Consolidation (PR #23) ─────────────
// Page Header / Badge Consistency ────────────────────────────────────────
// Every major AOC Capital page must carry a consistent header pattern: a
// title/subtitle, and the paper-only / real-execution-locked safety framing.
// Read-only reporting pages must additionally say "Read-only"; the
// governance page must frame itself as an MVP review aid; intake/setup
// pages must carry an educational / not-advice framing.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const MAJOR_PAGES = [
  "src/app/(protected)/capital/page.tsx",
  "src/app/(protected)/capital/overview/page.tsx",
  "src/app/(protected)/capital/allocation/page.tsx",
  "src/app/(protected)/capital/positions/page.tsx",
  "src/app/(protected)/capital/positions/[id]/page.tsx",
  "src/app/(protected)/capital/performance/closed/page.tsx",
  "src/app/(protected)/capital/performance/strategies/page.tsx",
  "src/app/(protected)/capital/performance/signals/page.tsx",
  "src/app/(protected)/capital/governance/snapshot/page.tsx",
  "src/app/(protected)/capital/strategies/page.tsx",
  "src/app/(protected)/capital/signals/page.tsx",
  "src/app/(protected)/capital/trade-intents/page.tsx",
  "src/app/(protected)/capital/capital-levels/page.tsx",
];

test("every major page file exists", () => {
  for (const page of MAJOR_PAGES) {
    assert.ok(fs.existsSync(page), `expected page file to exist: ${page}`);
  }
});

// Pages often source their badge/copy strings from a sibling `*-content.ts`
// module (see e.g. GOVERNANCE_BADGES in allocation-exposure-content.ts)
// rather than spelling them out inline, so the check below reads both the
// page file and any capital content module it imports from.
function readPageWithContentImports(pagePath) {
  const pageSrc = fs.readFileSync(pagePath, "utf8");
  const importMatches = [...pageSrc.matchAll(/from\s+"@\/lib\/capital\/([\w-]+)"/g)];
  const contentSrcs = importMatches
    .map((m) => `src/lib/capital/${m[1]}.ts`)
    .filter((f) => fs.existsSync(f))
    .map((f) => fs.readFileSync(f, "utf8"));
  return [pageSrc, ...contentSrcs].join("\n");
}

test("every major page carries paper-only and real-execution-locked framing", () => {
  for (const page of MAJOR_PAGES) {
    const combined = readPageWithContentImports(page);
    assert.match(combined, /[Pp]aper[\s-]only|[Ss]imulat/i, `${page} must carry paper-only/simulation framing`);
    assert.match(combined, /real execution|realExecutionLocked/i, `${page} must reference real-execution-locked status`);
  }
});

const READ_ONLY_PAGES = [
  "src/app/(protected)/capital/overview/page.tsx",
  "src/app/(protected)/capital/allocation/page.tsx",
  "src/app/(protected)/capital/performance/closed/page.tsx",
  "src/app/(protected)/capital/performance/strategies/page.tsx",
  "src/app/(protected)/capital/performance/signals/page.tsx",
  "src/app/(protected)/capital/governance/snapshot/page.tsx",
  "src/app/(protected)/capital/capital-levels/page.tsx",
];

test("read-only reporting pages state that they are read-only", () => {
  for (const page of READ_ONLY_PAGES) {
    const combined = readPageWithContentImports(page);
    assert.match(combined, /[Rr]ead-only|readOnly/, `${page} must state it is read-only`);
  }
});

test("Governance Snapshot frames itself as an internal MVP review aid", () => {
  const src = fs.readFileSync("src/lib/capital/portfolio-governance-snapshot-content.ts", "utf8");
  assert.match(src, /MVP review aid/i);
  assert.match(src, /does not indicate readiness for real trading/i);
});

const INTAKE_SETUP_CONTENT_FILES = ["src/lib/capital/investor-constitution-intake-content.ts", "src/lib/capital/strategy-library-content.ts"];

test("intake/setup content carries educational / not-advice framing", () => {
  for (const file of INTAKE_SETUP_CONTENT_FILES) {
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    assert.match(src, /[Nn]ot\s+(financial\s+)?(investment\s+)?advice|[Ee]ducational/, `${file} must carry a not-advice or educational framing`);
  }
});

test("every major page has a non-trivial title/subtitle pairing (either literal JSX text or an imported PAGE_TITLE/PAGE_SUBTITLE)", () => {
  for (const page of MAJOR_PAGES) {
    const src = fs.readFileSync(page, "utf8");
    const hasImportedTitle = /PAGE_TITLE/.test(src) || /PAGE_SUBTITLE/.test(src);
    const hasHeading = /<h1[\s>]|<h2[\s>]/.test(src);
    assert.ok(hasImportedTitle || hasHeading, `${page} must render a page title/subtitle`);
  }
});

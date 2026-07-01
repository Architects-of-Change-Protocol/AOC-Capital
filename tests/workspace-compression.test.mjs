import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("forbidden placeholder language removed", () => {
  const corpus = [
    read("src/components/pmfreak/workspace/workspace-shell.tsx"),
    read("src/components/pmfreak/workspace/workspace-conversation-shell.tsx"),
    read("src/components/pmfreak/operational-shell.tsx"),
  ].join("\n").toLowerCase();
  ["scaffold", "warming up", "coming soon", "upcoming", "future layer"].forEach((term) => {
    assert.equal(corpus.includes(term), false, `unexpected term: ${term}`);
  });
});

test("workspace header and readiness chips are compressed", () => {
  const shell = read("src/components/pmfreak/workspace/workspace-shell.tsx");
  ["labels.operationallyLive", "readiness.live", "readiness.context", "readiness.memory", "readiness.ready"].forEach((label) => {
    assert.equal(shell.includes(label), true, `missing ${label}`);
  });
});

test("lens headers and breadcrumbs use metadata labels", () => {
  const meta = read("src/lib/workspace/derived-lens-metadata.ts");
  const opShell = read("src/components/pmfreak/operational-shell.tsx");
  const dashboard = read("src/app/(protected)/dashboard/page.tsx");
  const executive = read("src/app/(protected)/executive/page.tsx");
  const portfolio = read("src/app/(protected)/portfolio/page.tsx");
  assert.equal(meta.includes("breadcrumbLabel"), true);
  assert.equal(meta.includes("displayLabel"), true);
  assert.equal(opShell.includes("activeLens.title.replace"), false);
  ["title=\"Summary\"", "Executive", "Portfolio"].forEach((token) => {
    assert.equal([dashboard, executive, portfolio].join("\n").includes(token), true);
  });
});

test("operational shell and empty state copy are concise", () => {
  const shell = read("src/components/pmfreak/operational-shell.tsx");
  ["Monitoring", "No active context", "Create your first context."].forEach((token) => {
    assert.equal(shell.includes(token), true);
  });
});

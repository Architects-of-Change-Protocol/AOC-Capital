import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = [
  "src/aoc/enterprise",
  "src/aoc/enterprise/runtime",
  "src/aoc/enterprise/sdk",
];

const FORBIDDEN_PATTERNS = [
  "@/lib/",
  "@/app/",
  "@/lib/auth",
  "@/lib/security",
  "server-authorization",
  "access-guards",
];

const BRIDGE_ALLOWLIST = new Set([]);

function collectTsFiles(root) {
  try {
    const st = statSync(root);
    if (!st.isDirectory()) return [];
  } catch {
    return [];
  }

  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        stack.push(full);
      } else if (/\.(ts|tsx|mts|cts)$/.test(name)) {
        out.push(full);
      }
    }
  }
  return out;
}

test("enterprise runtime sovereignty: enterprise layers do not import PMFreak app/lib security modules", () => {
  const files = ROOTS.flatMap(collectTsFiles);
  assert.ok(files.length > 0, "expected enterprise files to validate");

  for (const file of files) {
    if (BRIDGE_ALLOWLIST.has(file)) continue;
    const source = readFileSync(file, "utf8");
    for (const pattern of FORBIDDEN_PATTERNS) {
      assert.equal(
        source.includes(pattern),
        false,
        `forbidden dependency pattern '${pattern}' found in ${file}`,
      );
    }
  }
});

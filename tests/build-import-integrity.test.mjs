import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, "src");
const dashboardPage = path.join(repoRoot, "src/app/(protected)/dashboard/page.tsx");
const runtimeDirs = [
  path.join(repoRoot, "src/lib/runtime-hardening"),
  path.join(repoRoot, "src/lib/live-federation/ingestion"),
];

function collectFiles(dir, exts = new Set([".ts", ".tsx", ".mts", ".cts"])) {
  const files = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (exts.has(path.extname(entry.name))) files.push(full);
    }
  }
  return files;
}

test("no alias imports in src end with .ts", () => {
  for (const file of collectFiles(srcRoot)) {
    const content = fs.readFileSync(file, "utf8");
    assert.equal(/from\s+["']@\/.*\.ts["']/.test(content), false, `Alias .ts import found in ${path.relative(repoRoot, file)}`);
    assert.equal(/import\(\s*["']@\/.*\.ts["']\s*\)/.test(content), false, `Dynamic alias .ts import found in ${path.relative(repoRoot, file)}`);
  }
});

test("runtime hardening and live federation ingestion keep local imports extensionless (no .js drift)", () => {
  for (const dir of runtimeDirs) {
    for (const file of collectFiles(dir)) {
      const content = fs.readFileSync(file, "utf8");
      assert.equal(/from\s+["']\.{1,2}\/.*\.js["']/.test(content), false, `Relative .js import found in ${path.relative(repoRoot, file)}`);
      assert.equal(/import\(\s*["']\.{1,2}\/.*\.js["']\s*\)/.test(content), false, `Dynamic relative .js import found in ${path.relative(repoRoot, file)}`);
    }
  }
});

test("dashboard page imports dashboard runtime modules with extensionless alias paths", () => {
  const content = fs.readFileSync(dashboardPage, "utf8");
  assert.match(content, /from\s+["']@\/lib\/dashboard\/api-runtime["']/);
  assert.match(content, /from\s+["']@\/lib\/dashboard\/consumption["']/);
  assert.match(content, /from\s+["']@\/lib\/dashboard\/action-center["']/);
  assert.equal(content.includes("@/lib/dashboard/api-runtime/index.ts"), false);
  assert.equal(content.includes("@/lib/dashboard/consumption/index.ts"), false);
  assert.equal(content.includes("@/lib/dashboard/action-center/index.ts"), false);
});

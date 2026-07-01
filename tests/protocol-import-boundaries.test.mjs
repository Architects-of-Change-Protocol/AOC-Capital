import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const FORBIDDEN = ["@/lib", "@/app", "@/sdk", "@/aoc/enterprise", "../../runtime/"];
const collectSourceFiles = (dir) => {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) {
      found.push(...collectSourceFiles(full));
      continue;
    }
    if (/\.(ts|tsx|js|mjs)$/.test(full)) found.push(full.replaceAll("\\", "/"));
  }
  return found;
};

const protocolFiles = collectSourceFiles("src/aoc/protocol");

test("protocol files do not import forbidden runtime, enterprise, or PMFreak layers", () => {
  for (const file of protocolFiles) {
    const source = readFileSync(file, "utf8");
    for (const blocked of FORBIDDEN) {
      assert.equal(source.includes(blocked), false, `forbidden dependency found in ${file}: ${blocked}`);
    }
  }
});

test("protocol capability claims require explicit injection ports", () => {
  const source = readFileSync("src/aoc/protocol/contracts/capability-claims.ts", "utf8");
  assert.match(source, /ports: CapabilityClaimPorts/);
  assert.match(source, /ports\.trustDomain/);
  assert.match(source, /ports\.trustCoordination/);
  assert.doesNotMatch(source, /getAocAdapter/);
  assert.doesNotMatch(source, /process\.env/);
});

test("enterprise runtime owns capability claim port composition", () => {
  const source = readFileSync("src/aoc/enterprise/runtime/composition.ts", "utf8");
  assert.match(source, /export function composeCapabilityClaimPorts/);
  assert.match(source, /export function composeRuntimeContext/);
  assert.match(source, /const trustDomain = adapters\.trustDomain/);
  assert.match(source, /const trustCoordination = adapters\.trustCoordination/);
  assert.match(source, /const securityAudit = adapters\.securityAudit/);
});

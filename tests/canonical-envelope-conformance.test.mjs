import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("deny-response emits canonical fail-closed runtime envelope fields", () => {
  const src = readFileSync("src/lib/security/deny-response.ts", "utf8");
  assert.match(src, /sdkRuntimeError\(/);
    assert.match(src, /code:\s*"authorization_denied"/);
  assert.match(src, /error:\s*input\.message/);
});

test("sdk agents route emits canonical success envelope primitives", () => {
  const src = readFileSync("src/app/api/sdk/agents/route.ts", "utf8");
  assert.match(src, /sdkSuccess\(/);
  assert.match(src, /withRuntime\(/);
  assert.match(src, /lineage:/);
  assert.match(src, /runtimeDecisionId/);
});

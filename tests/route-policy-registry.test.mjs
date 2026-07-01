import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const registry = readFileSync("src/lib/auth/route-policy-registry.ts", "utf8");
const proxy = readFileSync("src/proxy.ts", "utf8");

test("auth routes classified correctly", () => {
  assert.match(registry, /const AUTH_ROUTES = \["\/login", "\/signup"\]/);
});

test("setup routes classified correctly", () => {
  assert.match(registry, /"\/workspace\/setup"/);
  assert.match(registry, /"\/getting-started"/);
  assert.match(registry, /"\/onboarding"/);
});

test("workspace core routes classified correctly", () => {
  assert.match(registry, /"\/workspace"/);
  assert.match(registry, /"\/copilot"/);
  assert.match(registry, /"\/projects"/);
  assert.match(registry, /"\/upload"/);
  assert.match(registry, /pathname\.startsWith\(`\$\{route\}\/`\)/);
});

test("contextual modules classified correctly", () => {
  assert.match(registry, /"\/dashboard"/);
  assert.match(registry, /"\/command-center"/);
  assert.match(registry, /"\/portfolio"/);
  assert.match(registry, /"\/executive"/);
  assert.match(registry, /"\/operational-memory"/);
  assert.match(registry, /"\/stakeholder-intel"/);
  assert.match(registry, /"\/trust"/);
  assert.match(registry, /"\/audit"/);
});

test("debug routes classified correctly", () => {
  assert.match(registry, /const INTERNAL_DEBUG_ROUTES = \["\/debug-session"\]/);
});

test("api routes classified correctly", () => {
  assert.match(registry, /if \(matchesRoute\(pathname, "\/api"\)\)/);
});

test("public routes classified correctly", () => {
  assert.match(registry, /"\/"/);
  assert.match(registry, /"\/forgot-password"/);
  assert.match(registry, /"\/auth\/callback"/);
  assert.match(registry, /"\/auth\/reset-password"/);
});

test("proxy no longer has manual route arrays", () => {
  assert.doesNotMatch(proxy, /const protectedRoutes/);
  assert.doesNotMatch(proxy, /const authRoutes/);
  assert.doesNotMatch(proxy, /const setupRoutes/);
});

test("proxy keeps direct navigation for onboarded users", () => {
  assert.doesNotMatch(proxy, /pathname !== decision\.destination/);
});

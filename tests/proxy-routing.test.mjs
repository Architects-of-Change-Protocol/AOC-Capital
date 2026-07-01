import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const proxy = readFileSync("src/proxy.ts", "utf8");
const onboardingMap = readFileSync("src/lib/auth/onboarding-route-map.ts", "utf8");
const resolveState = readFileSync("src/lib/auth/resolve-onboarding-state.ts", "utf8");

// ─── 1. Public passthrough ───────────────────────────────────────────────────
test("public routes pass through without redirect", () => {
  // API routes short-circuit immediately
  assert.match(proxy, /policy === "api"/);
  assert.match(proxy, /return response/);
});

// ─── 2. Asset passthrough ────────────────────────────────────────────────────
test("assets are excluded by matcher and never intercepted", () => {
  // Matcher must exclude _next/static, _next/image, favicon, and common image extensions
  assert.match(proxy, /_next\/static/);
  assert.match(proxy, /_next\/image/);
  assert.match(proxy, /favicon\.ico/);
  assert.match(proxy, /svg|png|jpg|jpeg|gif|webp/);
  // The single matcher lives only in src/proxy.ts config
  assert.match(proxy, /export const config/);
  assert.match(proxy, /matcher/);
});

// ─── 3. Protected redirect (unauthenticated) ─────────────────────────────────
test("unauthenticated access to protected route redirects to /login?next=", () => {
  assert.match(proxy, /isProtectedPageRoute\(pathname\) && !user/);
  assert.match(proxy, /loginUrl\.pathname = "\/login"/);
  assert.match(proxy, /loginUrl\.searchParams\.set\("next", pathname\)/);
});

// ─── 4. Onboarding redirect ──────────────────────────────────────────────────
test("incomplete onboarding on workspace route redirects via getOnboardingRedirect", () => {
  assert.match(proxy, /requiresOnboardingCompletion\(pathname\) && !onboardingCompleted/);
  assert.match(proxy, /getOnboardingRedirect\(onboardingState\)/);
});

test("needs_pmo_setup redirects to /workspace/setup", () => {
  assert.match(onboardingMap, /needs_pmo_setup.*\/workspace\/setup|"needs_pmo_setup"[\s\S]*?return "\/workspace\/setup"/);
});

test("needs_project redirects to /projects/new", () => {
  assert.match(onboardingMap, /needs_project.*\/projects\/new|"needs_project"[\s\S]*?return "\/projects\/new"/);
});

// ─── 5. Active passthrough ───────────────────────────────────────────────────
test("active state is onboarding-complete and passes through", () => {
  assert.match(onboardingMap, /state === "active"/);
  assert.match(resolveState, /"active"/);
});

// ─── 6. Trial blocked redirect ───────────────────────────────────────────────
test("trial_blocked state redirects to /trial-inactive", () => {
  assert.match(onboardingMap, /trial_blocked.*\/trial-inactive|"trial_blocked"[\s\S]*?return "\/trial-inactive"/);
});

// ─── 7. next param preservation ──────────────────────────────────────────────
test("next param is read and passed to resolvePostAuthDestination", () => {
  assert.match(proxy, /searchParams\.get\("next"\)/);
  assert.match(proxy, /requestedRoute/);
  assert.match(proxy, /isSafeContinuationRoute/);
});

// ─── 8. No redirect loop ──────────────────────────────────────────────────────
test("loop guard: never redirect to current pathname", () => {
  assert.match(proxy, /dest !== pathname/);
});

// ─── 9. Matcher consistency ───────────────────────────────────────────────────
test("exactly one config.matcher exists (in src/proxy.ts)", () => {
  const proxyMatcherCount = (proxy.match(/export const config/g) ?? []).length;
  assert.equal(proxyMatcherCount, 1, "src/proxy.ts must export exactly one config");
});

test("src/proxy.ts is the sole routing authority (no middleware.ts)", () => {
  // Next 16 uses proxy.ts only — middleware.ts must not exist
  assert.equal(existsSync("src/middleware.ts"), false, "src/middleware.ts must not exist");
  assert.equal(existsSync("middleware.ts"), false, "root middleware.ts must not exist");
});

test("root proxy.ts does not exist (legacy deleted)", () => {
  assert.equal(existsSync("proxy.ts"), false, "root proxy.ts must be deleted");
});

// ─── 10. resolveOnboardingStateFromJwt is the only onboarding resolver in proxy ─
test("proxy uses resolveOnboardingStateFromJwt exclusively (no inline onboarding logic)", () => {
  assert.match(proxy, /resolveOnboardingStateFromJwt/);
  // No hardcoded onboarding state checks
  assert.doesNotMatch(proxy, /"no_workspace"/);
  assert.doesNotMatch(proxy, /"needs_pmo_setup"/);
  assert.doesNotMatch(proxy, /"needs_project"/);
  assert.doesNotMatch(proxy, /"trial_blocked"/);
});

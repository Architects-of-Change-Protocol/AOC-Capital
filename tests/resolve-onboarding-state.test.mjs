import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const resolverSrc = readFileSync('src/lib/auth/resolve-onboarding-state.ts', 'utf8');
const routeMapSrc = readFileSync('src/lib/auth/onboarding-route-map.ts', 'utf8');
const postAuthSrc = readFileSync('src/lib/auth/resolve-post-auth-destination.ts', 'utf8');
const proxySrc = readFileSync('src/proxy.ts', 'utf8');
const layoutSrc = readFileSync('src/app/(protected)/layout.tsx', 'utf8');
const callbackSrc = readFileSync('src/app/auth/callback/route.ts', 'utf8');
const authRedirectSrc = readFileSync('src/lib/auth-redirect.ts', 'utf8');

// --- resolve-onboarding-state.ts ---

test('OnboardingState type covers all 5 states', () => {
  assert.match(resolverSrc, /"no_workspace"/);
  assert.match(resolverSrc, /"needs_pmo_setup"/);
  assert.match(resolverSrc, /"needs_project"/);
  assert.match(resolverSrc, /"active"/);
  assert.match(resolverSrc, /"trial_blocked"/);
});

test('returns "no_workspace" when workspaceId is null', () => {
  assert.match(resolverSrc, /if \(!workspaceId\) return "no_workspace"/);
});

test('returns "trial_blocked" for revoked or expired trials', () => {
  assert.match(resolverSrc, /return "trial_blocked"/);
  assert.match(resolverSrc, /trial_status.*revoked|revoked.*trial_status/);
  assert.match(resolverSrc, /trial_status.*expired|expired.*trial_status/);
});

test('returns "needs_pmo_setup" when no PMO tenant found', () => {
  assert.match(resolverSrc, /return "needs_pmo_setup"/);
  assert.match(resolverSrc, /!pmoResult\.found/);
});

test('returns "needs_project" when PMO exists but no projects', () => {
  assert.match(resolverSrc, /return "needs_project"/);
  assert.match(resolverSrc, /projects\.length === 0/);
});

test('returns "active" when fully onboarded', () => {
  assert.match(resolverSrc, /return "active"/);
});

test('bypasses trial check for internal/founder users (isRecovered option)', () => {
  assert.match(resolverSrc, /isFounderOrInternalUser/);
  assert.match(resolverSrc, /isRecovered/);
});

test('sync JWT resolver maps boolean to OnboardingState without DB access', () => {
  assert.match(resolverSrc, /resolveOnboardingStateFromJwt/);
  assert.match(resolverSrc, /onboardingCompleted.*active|active.*onboardingCompleted/);
});

// --- onboarding-route-map.ts ---

test('getOnboardingRedirect maps no_workspace to /workspace/setup', () => {
  assert.match(routeMapSrc, /"no_workspace"/);
  assert.match(routeMapSrc, /\/workspace\/setup/);
});

test('getOnboardingRedirect maps trial_blocked to /trial-inactive', () => {
  assert.match(routeMapSrc, /"trial_blocked"/);
  assert.match(routeMapSrc, /\/trial-inactive/);
});

test('getOnboardingRedirect maps needs_project to /projects/new', () => {
  assert.match(routeMapSrc, /"needs_project"/);
  assert.match(routeMapSrc, /\/projects\/new/);
});

test('isOnboardingComplete returns true only for "active" state', () => {
  assert.match(routeMapSrc, /isOnboardingComplete/);
  assert.match(routeMapSrc, /state === "active"/);
});

// --- resolve-post-auth-destination.ts ---

test('PostAuthContext accepts onboardingState (canonical) field', () => {
  assert.match(postAuthSrc, /onboardingState\?.*OnboardingState/);
});

test('onboardingCompleted is deprecated in favor of onboardingState', () => {
  assert.match(postAuthSrc, /@deprecated/);
  assert.match(postAuthSrc, /onboardingCompleted\?/);
});

test('Phase 4: non-active state overrides safe continuation route', () => {
  assert.match(postAuthSrc, /isOnboardingComplete\(state\)/);
  assert.match(postAuthSrc, /getOnboardingRedirect\(state\)/);
});

test('resolvePostAuthDestination uses getOnboardingRedirect for canonical state', () => {
  assert.match(postAuthSrc, /import.*getOnboardingRedirect.*onboarding-route-map/);
  assert.match(postAuthSrc, /import.*isOnboardingComplete.*onboarding-route-map/);
});

// --- proxy.ts ---

test('proxy uses resolveOnboardingStateFromJwt for Edge-safe sync resolution', () => {
  assert.match(proxySrc, /resolveOnboardingStateFromJwt/);
});

test('proxy uses isOnboardingComplete from canonical route map', () => {
  assert.match(proxySrc, /isOnboardingComplete/);
});

test('proxy uses getOnboardingRedirect instead of hardcoded /workspace/setup', () => {
  assert.match(proxySrc, /getOnboardingRedirect\(onboardingState\)/);
});

// --- layout.tsx ---

test('protected layout uses resolveOnboardingState (canonical resolver)', () => {
  assert.match(layoutSrc, /resolveOnboardingState/);
});

test('protected layout uses isOnboardingComplete for shell rendering decision', () => {
  assert.match(layoutSrc, /isOnboardingComplete\(onboardingState\)/);
});

test('protected layout no longer checks user.onboardingCompleted directly', () => {
  assert.doesNotMatch(layoutSrc, /user\.onboardingCompleted/);
});

test('protected layout no longer calls loadPmoTenant directly', () => {
  assert.doesNotMatch(layoutSrc, /loadPmoTenant/);
});

// --- auth/callback/route.ts ---

test('callback route uses resolveOnboardingState', () => {
  assert.match(callbackSrc, /resolveOnboardingState/);
});

test('callback route no longer reads onboarding_completed boolean directly', () => {
  assert.doesNotMatch(callbackSrc, /user_metadata\?\.onboarding_completed/);
});

// --- auth-redirect.ts ---

test('resolvePostAuthRedirectPath uses canonical resolver', () => {
  assert.match(authRedirectSrc, /resolveOnboardingState/);
});

test('getPostAuthRedirectPath is marked deprecated', () => {
  assert.match(authRedirectSrc, /@deprecated/);
});

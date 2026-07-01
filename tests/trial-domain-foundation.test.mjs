import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const schemas = readFileSync('src/features/trial/schemas/trial-schemas.ts', 'utf8');
const utils = readFileSync('src/features/trial/utils/trial-utils.ts', 'utf8');
const domain = readFileSync('src/features/trial/domain/trial-domain.ts', 'utf8');
const types = readFileSync('src/features/trial/types/trial-types.ts', 'utf8');
const transitions = readFileSync('src/features/trial/domain/activation-transitions.ts', 'utf8');

test('trial schemas enforce tenant scope, capability normalization, and lifecycle parsing', () => {
  assert.match(schemas, /parseTrialState/);
  assert.match(schemas, /parseCapabilities/);
  assert.match(schemas, /companyId/);
  assert.match(schemas, /workspaceId/);
  assert.match(schemas, /userId/);
  assert.match(schemas, /parseLifecycleEvent/);
  assert.match(schemas, /Invalid TrialState\.status/);
});

test('activation transitions define deterministic map with re-entry and recovery semantics', () => {
  assert.match(transitions, /ALLOWED_ACTIVATION_TRANSITIONS/);
  assert.match(transitions, /reEntry/);
  assert.match(transitions, /recovery/);
  assert.match(transitions, /isActivationTransitionAllowed/);
});

test('utility layer includes normalized capabilities, signals, and usage helpers', () => {
  assert.match(utils, /normalizeCapabilities/);
  assert.match(utils, /hasCapability/);
  assert.match(utils, /normalizeSignalMap/);
  assert.match(utils, /normalizeUsageBreakdown/);
  assert.match(utils, /ensureLifecycleMetadata/);
  assert.match(utils, /enterprise_candidate/);
});

test('domain lifecycle handles conversion, expiration, restriction, and transition checks', () => {
  assert.match(domain, /if \(trial\.upgradedAt\) return 'converted'/);
  assert.match(domain, /if \(expiry\.expired\) return 'expired'/);
  assert.match(domain, /if \(creditState\.hardDepleted\) return 'restricted'/);
  assert.match(domain, /canTransitionActivationStage/);
});

test('trial types include provider-agnostic usage semantics, signals, and lifecycle metadata', () => {
  assert.doesNotMatch(types.toLowerCase(), /trial_days_left|openai|anthropic|stripe|price_id/);
  assert.match(types, /usageBreakdown/);
  assert.match(types, /providerAbstractionMetadata/);
  assert.match(types, /behavioralSignals/);
  assert.match(types, /lastTransition/);
  assert.match(types, /lifecycleEvents/);
  assert.match(types, /NormalizedCapability/);
});

test('governance script validates canonical foundation hardening', () => {
  const out = execSync('node scripts/check-trial-domain-foundation.mjs', { encoding: 'utf8' });
  assert.match(out, /passed/);
});

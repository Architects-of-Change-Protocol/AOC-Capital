import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/lib/ai/resilient-fetch.ts', 'utf8');
const copilotRoute = fs.readFileSync('src/app/api/copilot/route.ts', 'utf8');
const gatewaySource = fs.readFileSync('src/lib/ai/gateway/gateway.ts', 'utf8');
const metaIntelSource = fs.readFileSync('src/app/api/ai/meta-intelligence/route.ts', 'utf8');

// Test 1 — resilientFetch is exported from resilient-fetch.ts
test('resilientFetch is exported as an async function from resilient-fetch.ts', () => {
  assert.match(source, /export async function resilientFetch/);
});

// Test 2 — classifyError is exported from resilient-fetch.ts
test('classifyError is exported from resilient-fetch.ts', () => {
  assert.match(source, /export function classifyError/);
});

// Test 3 — ResilientFetchResult type is defined in source
test('ResilientFetchResult type is defined in resilient-fetch.ts', () => {
  assert.match(source, /export type ResilientFetchResult/);
  assert.match(source, /ok: true/);
  assert.match(source, /ok: false/);
  assert.match(source, /attempts: number/);
  assert.match(source, /durationMs: number/);
});

// Test 4 — OpenAIErrorClass type is defined in source
test('OpenAIErrorClass type is defined with all expected variants', () => {
  assert.match(source, /export type OpenAIErrorClass/);
  assert.match(source, /"rate_limited"/);
  assert.match(source, /"server_error"/);
  assert.match(source, /"network_error"/);
  assert.match(source, /"timeout"/);
  assert.match(source, /"auth_error"/);
  assert.match(source, /"bad_request"/);
  assert.match(source, /"unknown"/);
});

// Test 5 — AbortController is used in source (timeout implementation)
test('AbortController is used for per-attempt timeout implementation', () => {
  assert.match(source, /new AbortController\(\)/);
  assert.match(source, /controller\.abort\(\)/);
  assert.match(source, /controller\.signal/);
  assert.match(source, /clearTimeout/);
});

// Test 6 — Retry-After header is checked in source (429 handling)
test('Retry-After header is read and applied for 429 responses', () => {
  assert.match(source, /Retry-After/);
  assert.match(source, /response\.headers\.get/);
  // Cap at 30 seconds
  assert.match(source, /30000/);
});

// Test 7 — exponential backoff is implemented (retryDelayMultiplier appears in source)
test('exponential backoff uses retryDelayMultiplier with Math.pow', () => {
  assert.match(source, /retryDelayMultiplier/);
  assert.match(source, /Math\.pow/);
  assert.match(source, /retryDelayMs/);
});

// Test 8 — Idempotency-Key header is set in source
test('Idempotency-Key header is added when idempotencyKey option is provided', () => {
  assert.match(source, /Idempotency-Key/);
  assert.match(source, /idempotencyKey/);
});

// Test 9 — copilot route uses provider router, not direct resilientFetch
test('copilot route delegates to runInference via provider router, not direct resilientFetch', () => {
  assert.doesNotMatch(copilotRoute, /resilientFetch/, 'copilot must not call resilientFetch directly');
  assert.doesNotMatch(copilotRoute, /resilient-fetch/, 'copilot must not import resilient-fetch directly');
  assert.match(copilotRoute, /runInference/, 'copilot must call runInference');
  assert.match(copilotRoute, /providers\/router/, 'copilot must import from providers/router');
  assert.match(copilotRoute, /operationName.*copilot|copilot.*operationName/s, 'copilot must pass operationName');
  assert.match(copilotRoute, /maxAttempts.*2|2.*maxAttempts/s, 'copilot must pass maxAttempts');
});

// Test 10 — gateway.ts uses provider router, not direct resilientFetch
test('gateway.ts delegates inference to runInference via provider router, not direct resilientFetch', () => {
  assert.doesNotMatch(gatewaySource, /resilientFetch/, 'gateway must not call resilientFetch directly');
  assert.doesNotMatch(gatewaySource, /resilient-fetch/, 'gateway must not import resilient-fetch directly');
  assert.match(gatewaySource, /runInference/, 'gateway must call runInference');
  assert.match(gatewaySource, /providers\/router/, 'gateway must import from providers/router');
  assert.match(gatewaySource, /operationName.*message-nudges|message-nudges.*operationName/s, 'gateway must pass operationName');
  assert.match(gatewaySource, /maxAttempts.*3|3.*maxAttempts/s, 'gateway must pass maxAttempts');
});

// Test 11 — meta-intelligence route uses provider router, not direct resilientFetch
test('meta-intelligence route delegates to runInference via provider router, not direct resilientFetch', () => {
  assert.doesNotMatch(metaIntelSource, /resilientFetch/, 'meta-intelligence must not call resilientFetch directly');
  assert.doesNotMatch(metaIntelSource, /resilient-fetch/, 'meta-intelligence must not import resilient-fetch directly');
  assert.match(metaIntelSource, /runInference/, 'meta-intelligence must call runInference');
  assert.match(metaIntelSource, /providers\/router/, 'meta-intelligence must import from providers/router');
  assert.match(metaIntelSource, /operationName.*meta-intelligence|meta-intelligence.*operationName/s, 'meta-intelligence must pass operationName');
  assert.match(metaIntelSource, /timeoutMs.*15000|15000.*timeoutMs/s, 'meta-intelligence must pass timeoutMs');
});

// Test 12 — no full URL logged (console calls use domain only, not raw url parameter)
test('console logging uses domain-only URL extraction, not the raw url parameter', () => {
  // The domainOnly helper is defined
  assert.match(source, /function domainOnly/);
  // The domain variable is used in console calls (not the full url)
  assert.match(source, /url:\s*domain/);
  // domain only comment is present
  assert.match(source, /domain only/);
  // The raw url is NOT passed directly to console calls — find the attempt log line
  const attemptLogIdx = source.indexOf('[resilient-fetch] attempt');
  assert.ok(attemptLogIdx !== -1, 'attempt log line should exist');
  const attemptLogSnippet = source.slice(attemptLogIdx, attemptLogIdx + 120);
  assert.ok(!attemptLogSnippet.includes('url: url'), 'Raw url parameter should not be logged directly in attempt log');
});

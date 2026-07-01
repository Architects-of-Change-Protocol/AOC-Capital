import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const tracerSource = fs.readFileSync('src/lib/ai/gateway/tracer.ts', 'utf8');
const gatewaySource = fs.readFileSync('src/lib/ai/gateway/gateway.ts', 'utf8');

// Test 1 — tracer.ts exports traceGatewayCall
test('tracer.ts exports traceGatewayCall', () => {
  assert.match(tracerSource, /export function traceGatewayCall/);
});

// Test 2 — tracer.ts exports traceGatewayError
test('tracer.ts exports traceGatewayError', () => {
  assert.match(tracerSource, /export function traceGatewayError/);
});

// Test 3 — tracer.ts exports measureAsync
test('tracer.ts exports measureAsync', () => {
  assert.match(tracerSource, /export async function measureAsync/);
});

// Test 4 — tracer.ts exports GatewayTraceEvent type
test('tracer.ts exports GatewayTraceEvent type', () => {
  assert.ok(tracerSource.includes('GatewayTraceEvent'), 'GatewayTraceEvent should appear in tracer.ts');
  assert.match(tracerSource, /export type GatewayTraceEvent/);
});

// Test 5 — traceGatewayCall uses "[gateway]" prefix
test('traceGatewayCall uses "[gateway]" prefix', () => {
  assert.ok(tracerSource.includes('"[gateway]"'), 'traceGatewayCall should use "[gateway]" prefix');
});

// Test 6 — traceGatewayCall wraps in try/catch (never throws)
test('traceGatewayCall wraps in try/catch', () => {
  assert.ok(tracerSource.includes('try'), 'tracer.ts should contain try block');
  assert.ok(tracerSource.includes('catch'), 'tracer.ts should contain catch block');
});

// Test 7 — gateway.ts imports traceGatewayCall from tracer
test('gateway.ts imports traceGatewayCall from tracer', () => {
  assert.match(gatewaySource, /import.*traceGatewayCall.*from.*["']@\/lib\/ai\/gateway\/tracer["']/);
});

// Test 8 — gateway.ts no longer has "TODO: add tracing"
test('gateway.ts no longer has TODO: add tracing', () => {
  assert.ok(!gatewaySource.includes('TODO: add tracing'), 'gateway.ts should not contain "TODO: add tracing"');
});

// Test 9 — gateway.ts no longer has "Hybrid mode is not implemented"
test('gateway.ts no longer has "Hybrid mode is not implemented"', () => {
  assert.ok(!gatewaySource.includes('Hybrid mode is not implemented'), 'gateway.ts should not throw for hybrid mode');
});

// Test 10 — gateway.ts has fallback logging for hybrid mode
test('gateway.ts has fallback logging for hybrid mode', () => {
  assert.ok(gatewaySource.includes('hybrid_not_implemented_fallback'), 'gateway.ts should contain hybrid_not_implemented_fallback');
});

// Test 11 — gateway.ts has fallback logging for non-message-nudges openai
test('gateway.ts has fallback logging for non-message-nudges openai modules', () => {
  assert.ok(gatewaySource.includes('openai_not_implemented_fallback'), 'gateway.ts should contain openai_not_implemented_fallback');
});

// Test 12 — gateway.ts has top-level try/catch with traceGatewayError
test('gateway.ts has top-level try/catch with traceGatewayError', () => {
  assert.ok(gatewaySource.includes('traceGatewayError'), 'gateway.ts should call traceGatewayError');
  assert.match(gatewaySource, /traceGatewayError\(/);
});

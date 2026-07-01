import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const contractsSource = fs.readFileSync('src/lib/contracts/index.ts', 'utf8');
const copilotRoute = fs.readFileSync('src/app/api/copilot/route.ts', 'utf8');
const memoryLib = fs.readFileSync('src/lib/operational-memory-v1.ts', 'utf8');

// Test 1 — CopilotRequestContract is exported
test('CopilotRequestContract is exported from src/lib/contracts/index.ts', () => {
  assert.match(contractsSource, /export const CopilotRequestContract/);
});

// Test 2 — CopilotResponseContract is exported
test('CopilotResponseContract is exported from src/lib/contracts/index.ts', () => {
  assert.match(contractsSource, /export const CopilotResponseContract/);
});

// Test 3 — OperationalMemoryEntryContract is exported
test('OperationalMemoryEntryContract is exported from src/lib/contracts/index.ts', () => {
  assert.match(contractsSource, /export const OperationalMemoryEntryContract/);
});

// Test 4 — OperationalMemoryCandidateContract is exported
test('OperationalMemoryCandidateContract is exported from src/lib/contracts/index.ts', () => {
  assert.match(contractsSource, /export const OperationalMemoryCandidateContract/);
});

// Test 5 — createAIResponseEnvelopeValidator is exported
test('createAIResponseEnvelopeValidator factory is exported from src/lib/contracts/index.ts', () => {
  assert.match(contractsSource, /export function createAIResponseEnvelopeValidator/);
});

// Test 6 — ParseResult type is defined
test('ParseResult type is defined in src/lib/contracts/index.ts', () => {
  assert.match(contractsSource, /export type ParseResult/);
  assert.match(contractsSource, /ok: true/);
  assert.match(contractsSource, /ok: false/);
});

// Test 7 — ValidationError type is defined
test('ValidationError type is defined in src/lib/contracts/index.ts', () => {
  assert.match(contractsSource, /export type ValidationError/);
  assert.match(contractsSource, /field: string/);
  assert.match(contractsSource, /message: string/);
  assert.match(contractsSource, /received: unknown/);
});

// Test 8 — partial() combinator is defined and exported
test('partial() combinator is defined and exported in src/lib/contracts/index.ts', () => {
  assert.match(contractsSource, /export function partial/);
  // partial must always return ok: true (fail-soft)
  assert.match(contractsSource, /return \{ ok: true, data \}/);
});

// Test 9 — copilot route imports CopilotRequestContract
test('copilot route integrates CopilotRequestContract', () => {
  assert.match(copilotRoute, /CopilotRequestContract/);
  assert.match(copilotRoute, /from "@\/lib\/contracts"/);
  // Must use the contract to validate the request
  assert.match(copilotRoute, /CopilotRequestContract\(payload\)/);
  // Must return 400 on failure
  assert.match(copilotRoute, /INVALID_REQUEST/);
});

// Test 10 — copilot route imports CopilotResponseContract
test('copilot route integrates CopilotResponseContract', () => {
  assert.match(copilotRoute, /CopilotResponseContract/);
  // Must use the contract on the parsed AI response
  assert.match(copilotRoute, /CopilotResponseContract\(parsed\)/);
  // Must log validation telemetry
  assert.match(copilotRoute, /copilot_response_validated/);
  // Must use the validated data in result construction
  assert.match(copilotRoute, /parsedValidated/);
});

// Test 11 — operational-memory-v1 integrates OperationalMemoryCandidateContract
test('operational-memory-v1 integrates OperationalMemoryCandidateContract', () => {
  assert.match(memoryLib, /OperationalMemoryCandidateContract/);
  assert.match(memoryLib, /from "@\/lib\/contracts"/);
  // Must filter candidates using the contract
  assert.match(memoryLib, /memory_candidate_invalid/);
});

// Test 12 — contracts/index.ts has no import from any external validation library
test('contracts/index.ts has no dependency on zod, io-ts, or any external validation library', () => {
  assert.ok(!contractsSource.includes('from "zod"'), 'must not import from "zod"');
  assert.ok(!contractsSource.includes("from 'zod'"), "must not import from 'zod'");
  assert.ok(!contractsSource.includes('require("zod")'), 'must not require("zod")');
  assert.ok(!contractsSource.includes('from "io-ts"'), 'must not import from "io-ts"');
  assert.ok(!contractsSource.includes('from "yup"'), 'must not import from "yup"');
  assert.ok(!contractsSource.includes('from "joi"'), 'must not import from "joi"');
  assert.ok(!contractsSource.includes('from "superstruct"'), 'must not import from "superstruct"');
});

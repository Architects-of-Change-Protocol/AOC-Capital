import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const contractsSource = fs.readFileSync('src/lib/contracts/index.ts', 'utf8');
const memoryV1Source = fs.readFileSync('src/lib/operational-memory-v1.ts', 'utf8');
const supabaseSource = fs.readFileSync('src/lib/aoc/providers/supabase.ts', 'utf8');
const projectMemorySource = fs.readFileSync('src/lib/project-memory.ts', 'utf8');

// Test 1 — OperationalMemoryRecordContract exported from contracts/index.ts
test('OperationalMemoryRecordContract is exported from src/lib/contracts/index.ts', () => {
  assert.match(contractsSource, /export const OperationalMemoryRecordContract/);
});

// Test 2 — StoredProjectAnalysisContract exported from contracts/index.ts
test('StoredProjectAnalysisContract is exported from src/lib/contracts/index.ts', () => {
  assert.match(contractsSource, /export const StoredProjectAnalysisContract/);
});

// Test 3 — recordOrNull primitive defined in contracts/index.ts
test('recordOrNull primitive is defined and exported in src/lib/contracts/index.ts', () => {
  assert.match(contractsSource, /export function recordOrNull/);
});

// Test 4 — numberInRange primitive defined in contracts/index.ts
test('numberInRange primitive is defined and exported in src/lib/contracts/index.ts', () => {
  assert.match(contractsSource, /export function numberInRange/);
});

// Test 5 — validateAndMapRow helper defined in operational-memory-v1.ts
test('validateAndMapRow helper is defined in src/lib/operational-memory-v1.ts', () => {
  assert.match(memoryV1Source, /function validateAndMapRow/);
});

// Test 6 — operational-memory-v1.ts imports OperationalMemoryEntryContract
test('operational-memory-v1.ts imports OperationalMemoryEntryContract from @/lib/contracts', () => {
  assert.match(memoryV1Source, /OperationalMemoryEntryContract/);
  assert.match(memoryV1Source, /from "@\/lib\/contracts"/);
});

// Test 7 — operational-memory-v1.ts uses filter with OperationalMemoryEntry type guard
test('operational-memory-v1.ts uses .filter type guard for OperationalMemoryEntry', () => {
  assert.match(memoryV1Source, /\.filter\(\(e\): e is OperationalMemoryEntry/);
});

// Test 8 — aoc/providers/supabase.ts imports OperationalMemoryRecordContract
test('aoc/providers/supabase.ts imports OperationalMemoryRecordContract from @/lib/contracts', () => {
  assert.match(supabaseSource, /OperationalMemoryRecordContract/);
  assert.match(supabaseSource, /from "@\/lib\/contracts"/);
});

// Test 9 — aoc/providers/supabase.ts filters mapRecord output using contract
test('aoc/providers/supabase.ts applies OperationalMemoryRecordContract to filter mapRecord output', () => {
  assert.match(supabaseSource, /OperationalMemoryRecordContract\(record\)/);
});

// Test 10 — project-memory.ts imports StoredProjectAnalysisContract
test('project-memory.ts imports StoredProjectAnalysisContract from @/lib/contracts', () => {
  assert.match(projectMemorySource, /StoredProjectAnalysisContract/);
  assert.match(projectMemorySource, /from "@\/lib\/contracts"/);
});

// Test 11 — project-memory.ts filters mapRowToStoredProject output using contract
test('project-memory.ts applies StoredProjectAnalysisContract to filter mapRowToStoredProject output', () => {
  assert.match(projectMemorySource, /StoredProjectAnalysisContract\(project\)/);
});

// Test 12 — contracts/index.ts does not import from operational-memory-v1.ts (circular import guard)
test('contracts/index.ts does not import from operational-memory-v1.ts (no circular dependency)', () => {
  const importLines = contractsSource
    .split('\n')
    .filter((line) => /^\s*import\s/.test(line));
  const hasMemoryImport = importLines.some(
    (line) => line.includes('operational-memory-v1') || line.includes('project-memory')
  );
  assert.ok(!hasMemoryImport, 'contracts/index.ts must not import from memory modules');
});

// Test 13 — console.warn called with "[contracts]" prefix in operational-memory-v1.ts
test('operational-memory-v1.ts logs invalid rows with "[contracts] operational_memory_entry_invalid" prefix', () => {
  assert.ok(
    memoryV1Source.includes('"[contracts] operational_memory_entry_invalid"'),
    'operational-memory-v1.ts must warn with [contracts] operational_memory_entry_invalid'
  );
});

// Test 14 — console.warn called with "[contracts]" prefix in aoc/providers/supabase.ts
test('aoc/providers/supabase.ts logs invalid records with "[contracts] operational_memory_record_invalid" prefix', () => {
  assert.ok(
    supabaseSource.includes('"[contracts] operational_memory_record_invalid"'),
    'aoc/providers/supabase.ts must warn with [contracts] operational_memory_record_invalid'
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const memoryLib = fs.readFileSync('src/lib/operational-memory-v1.ts', 'utf8');
const memoryRoute = fs.readFileSync('src/app/api/operational-memory/route.ts', 'utf8');
const copilotRoute = fs.readFileSync('src/app/api/copilot/route.ts', 'utf8');
const uploadRoute = fs.readFileSync('src/app/api/upload/route.ts', 'utf8');

test('memory model includes required operational categories and audit fields', () => {
  for (const type of ['risks','blockers','decisions','stakeholders','action_items','unresolved_questions','dependencies','milestones','escalations']) {
    assert.match(memoryLib, new RegExp(`"${type}"`));
  }
  assert.match(memoryLib, /sourceType/);
  assert.match(memoryLib, /sourceReference/);
  assert.match(memoryLib, /createdAt/);
  assert.match(memoryLib, /status: MemoryStatus/);
});

test('extraction and append pipeline is wired from upload and copilot', () => {
  assert.match(uploadRoute, /extractOperationalMemoryCandidates/);
  assert.match(uploadRoute, /appendOperationalMemory/);
  assert.match(copilotRoute, /extractOperationalMemoryCandidates/);
  assert.match(copilotRoute, /appendOperationalMemory/);
});

test('retrieval supports unresolved filtering and memory type scoping', () => {
  assert.match(memoryRoute, /unresolvedOnly/);
  assert.match(memoryRoute, /memoryType/);
  assert.match(memoryRoute, /getOperationalMemory/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const approvalCardPath = 'src/components/governance/ApprovalCard.tsx';
const delegationCardPath = 'src/components/governance/DelegationCard.tsx';
const governancePage = 'src/app/(protected)/governance/page.tsx';

test('ApprovalCard.tsx exists at src/components/governance/ApprovalCard.tsx', () => {
  assert.ok(fs.existsSync(approvalCardPath), `Expected file at ${approvalCardPath}`);
});

test('DelegationCard.tsx exists at src/components/governance/DelegationCard.tsx', () => {
  assert.ok(fs.existsSync(delegationCardPath), `Expected file at ${delegationCardPath}`);
});

test('ApprovalCard contains action label map with ai.execute → Run AI action', () => {
  const src = fs.readFileSync(approvalCardPath, 'utf8');
  assert.ok(src.includes('"ai.execute"'), 'Expected "ai.execute" key in action map');
  assert.ok(src.includes('"Run AI action"'), 'Expected "Run AI action" label in action map');
});

test('ApprovalCard does NOT contain JSON.stringify (no raw trace dump)', () => {
  const src = fs.readFileSync(approvalCardPath, 'utf8');
  assert.ok(!src.includes('JSON.stringify'), 'ApprovalCard must not use JSON.stringify');
});

test('ApprovalCard contains formatRelative function', () => {
  const src = fs.readFileSync(approvalCardPath, 'utf8');
  assert.ok(src.includes('function formatRelative'), 'Expected formatRelative function in ApprovalCard');
});

test('ApprovalCard contains risk badge color classes for all severity levels', () => {
  const src = fs.readFileSync(approvalCardPath, 'utf8');
  assert.ok(src.includes('rose-'), 'Expected rose color class for critical risk');
  assert.ok(src.includes('amber-'), 'Expected amber color class for high risk');
  assert.ok(src.includes('yellow-'), 'Expected yellow color class for medium risk');
  assert.ok(src.includes('slate-'), 'Expected slate color class for low risk');
});

test('DelegationCard contains usage progress bar implementation', () => {
  const src = fs.readFileSync(delegationCardPath, 'utf8');
  assert.ok(src.includes('usePct') || src.includes('usagePct') || src.includes('width'), 'Expected progress bar width logic');
  assert.ok(src.includes('bg-cyan-500/30'), 'Expected cyan fill color for progress bar');
  assert.ok(src.includes('bg-slate-700/50'), 'Expected slate track color for progress bar');
});

test('DelegationCard does NOT contain JSON.stringify (no lineage dump)', () => {
  const src = fs.readFileSync(delegationCardPath, 'utf8');
  assert.ok(!src.includes('JSON.stringify'), 'DelegationCard must not use JSON.stringify');
});

test('governance page uses getActorLabel function', () => {
  const src = fs.readFileSync(governancePage, 'utf8');
  assert.ok(src.includes('function getActorLabel'), 'Expected getActorLabel function definition');
  assert.ok(src.includes('getActorLabel('), 'Expected getActorLabel to be called');
});

test('governance page uses getDelegateeLabel function', () => {
  const src = fs.readFileSync(governancePage, 'utf8');
  assert.ok(src.includes('function getDelegateeLabel'), 'Expected getDelegateeLabel function definition');
  assert.ok(src.includes('getDelegateeLabel('), 'Expected getDelegateeLabel to be called');
});

test('governance page separates pending from resolved requests', () => {
  const src = fs.readFileSync(governancePage, 'utf8');
  assert.ok(src.includes('pending_approval'), 'Expected pending_approval filter logic');
  assert.ok(
    src.includes('.filter(') && src.includes('pending_approval'),
    'Expected filter logic that separates pending from resolved'
  );
});

test('governance page imports ApprovalCard from @/components/governance/ApprovalCard', () => {
  const src = fs.readFileSync(governancePage, 'utf8');
  assert.ok(
    src.includes('@/components/governance/ApprovalCard'),
    'Expected import from @/components/governance/ApprovalCard'
  );
});

test('governance page imports DelegationCard from @/components/governance/DelegationCard', () => {
  const src = fs.readFileSync(governancePage, 'utf8');
  assert.ok(
    src.includes('@/components/governance/DelegationCard'),
    'Expected import from @/components/governance/DelegationCard'
  );
});

test('governance page has empty state text for no approval requests', () => {
  const src = fs.readFileSync(governancePage, 'utf8');
  assert.ok(
    src.includes('No approval requests yet'),
    'Expected empty state text "No approval requests yet"'
  );
});

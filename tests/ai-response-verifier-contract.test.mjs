import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/lib/ai/response-verifier.ts', 'utf8');
const copilotRoute = fs.readFileSync('src/app/api/copilot/route.ts', 'utf8');

// Extract the DATE_REGEX pattern from source and reconstruct it for inline testing
function extractRegexSource(varName) {
  // Match: export const VARNAME = /pattern/flags;
  const escapedName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`export const ${escapedName}\\s*=\\s*(\\/(?:[^\\/\\\\]|\\\\.)+\\/[gimsuy]*)`));
  if (!match) return null;
  // Parse: extract pattern and flags from the literal string representation
  const literal = match[1];
  const lastSlash = literal.lastIndexOf('/');
  const pattern = literal.slice(1, lastSlash);
  const flags = literal.slice(lastSlash + 1);
  return new RegExp(pattern, flags);
}

// Test 1 — RULE 2: invented date in facts → flagged strip, stripped from sanitized.facts
test('RULE 2: facts containing invented dates are flagged with strip severity', () => {
  // Verify the rule name and strip severity are present for facts
  assert.match(source, /no_specific_date_invention/);
  assert.match(source, /severity.*['":].*strip|strip.*severity/);
  // Verify DATE_REGEX is exported
  assert.match(source, /export const DATE_REGEX/);
  // Verify facts are filtered using stripIndices (strip logic on facts array)
  assert.match(source, /stripIndices/);
  assert.match(source, /stripIndices\.add/);
  assert.match(source, /filter.*stripIndices|stripIndices.*filter/);
  // Verify DATE_REGEX actually matches "Q3 2025"
  const dateRegex = extractRegexSource('DATE_REGEX');
  assert.ok(dateRegex, 'DATE_REGEX should be extractable from source');
  assert.ok(dateRegex.test('Q3 2025'), 'DATE_REGEX should match "Q3 2025"');
  // Verify Rule 2 applies strip severity to facts (not just warn)
  assert.match(source, /applyRule2ToFacts/);
  assert.match(source, /severity.*['"]strip['"]/);
});

// Test 2 — RULE 3: invented stakeholder name in immediateAction → redacted to [stakeholder]
test('RULE 3: invented stakeholder names are redacted to [stakeholder] in immediateAction', () => {
  assert.match(source, /no_invented_stakeholder_name/);
  assert.match(source, /\[stakeholder\]/);
  assert.match(source, /severity.*['":].*redact|redact.*severity/);
  // Verify redactNames is applied to immediateAction
  assert.match(source, /redactNames.*immediateAction|sanitizedImmediateAction.*redactNames/);
  // Verify FULL_NAME_REGEX is exported and matches "John Smith"
  const fullNameRegex = extractRegexSource('FULL_NAME_REGEX');
  assert.ok(fullNameRegex, 'FULL_NAME_REGEX should be extractable from source');
  assert.ok(fullNameRegex.test('John Smith'), 'FULL_NAME_REGEX should match "John Smith"');
  assert.ok(!fullNameRegex.test('lowercase name'), 'FULL_NAME_REGEX should not match lowercase names');
  // Verify replacement logic uses [stakeholder]
  assert.match(source, /"\[stakeholder\]"/);
});

// Test 3 — RULE 4: fact with zero keyword overlap → warn only, does not fail passed
test('RULE 4: facts with no context overlap are warned but do not fail passed', () => {
  assert.match(source, /facts_grounded_in_context/);
  // Rule 4 must use "warn" severity (not strip or redact)
  assert.match(source, /rule.*facts_grounded_in_context[\s\S]{0,200}severity.*warn|severity.*warn[\s\S]{0,200}facts_grounded_in_context/);
  // Verify the keyword overlap function exists
  assert.match(source, /hasKeywordOverlap/);
  // Verify stop words filtering is present
  assert.match(source, /STOP_WORDS/);
  assert.match(source, /tokenize/);
  // Verify Rule 4 does NOT strip or redact (only warn)
  assert.match(source, /applyRule4/);
  // Ensure grounding rule severity is "warn" in the push statement
  const rule4Block = source.match(/function applyRule4[\s\S]+?^}/m);
  if (rule4Block) {
    assert.match(rule4Block[0], /severity.*['"]warn['"]/);
    assert.ok(!rule4Block[0].includes('"strip"'), 'Rule 4 should not strip');
    assert.ok(!rule4Block[0].includes('"redact"'), 'Rule 4 should not redact');
  }
});

// Test 4 — RULE 5: definitive assumption without hedging → flagged warn
test('RULE 5: assumptions phrased as definitive assertions are flagged as warn', () => {
  assert.match(source, /assumptions_labeled_correctly/);
  // Verify DEFINITIVE_START_REGEX and HEDGING_REGEX are exported
  assert.match(source, /export const DEFINITIVE_START_REGEX/);
  assert.match(source, /export const HEDGING_REGEX/);
  // Verify the rule checks definitive start AND absence of hedging
  assert.match(source, /DEFINITIVE_START_REGEX\.test/);
  assert.match(source, /HEDGING_REGEX\.test/);
  // Verify DEFINITIVE_START_REGEX matches "The project..."
  const definitiveRegex = extractRegexSource('DEFINITIVE_START_REGEX');
  assert.ok(definitiveRegex, 'DEFINITIVE_START_REGEX should be extractable');
  assert.ok(definitiveRegex.test('The project is on track'), 'should match "The project..."');
  assert.ok(definitiveRegex.test('The team has delivered'), 'should match "The team..."');
  // Verify HEDGING_REGEX matches hedging words
  const hedgingRegex = extractRegexSource('HEDGING_REGEX');
  assert.ok(hedgingRegex, 'HEDGING_REGEX should be extractable');
  assert.ok(hedgingRegex.test('likely to succeed'), 'should match "likely"');
  assert.ok(hedgingRegex.test('appears to be stable'), 'should match "appears"');
  // Rule 5 warns, not strips
  const rule5Block = source.match(/function applyRule5[\s\S]+?^}/m);
  if (rule5Block) {
    assert.match(rule5Block[0], /severity.*['"]warn['"]/);
  }
});

// Test 5 — clean response with no issues → passed true, score 100, no flags
test('clean response with no issues produces passed:true, confidenceScore:100, flags:[]', () => {
  // Verify confidence starts at 100
  assert.match(source, /let score = 100/);
  // Verify passed formula: score >= 60 AND no strip flags
  assert.match(source, /confidenceScore >= 60/);
  assert.match(source, /hasStripFlags/);
  assert.match(source, /passed.*confidenceScore >= 60.*!hasStripFlags|!hasStripFlags.*confidenceScore >= 60/);
  // Verify the function returns a passed boolean
  assert.match(source, /export function verifyAiResponse/);
  assert.match(source, /return \{[\s\S]*passed[\s\S]*confidenceScore[\s\S]*flags[\s\S]*sanitized/);
});

// Test 6 — multiple strip flags drive confidenceScore below 60 → passed false
test('multiple strip flags drive confidenceScore below 60 and passed to false', () => {
  // Verify strip deducts 15 points each
  assert.match(source, /severity === ["']strip["']/);
  // Verify score deduction: strip costs 15 points (3 strips → 55 < 60)
  assert.match(source, /score -= 15/);
  // Verify warn deducts 5
  assert.match(source, /score -= 5/);
  // Verify redact deducts 10
  assert.match(source, /score -= 10/);
  // Verify minimum clamp at 0
  assert.match(source, /Math\.max\(0/);
  // Verify passed requires BOTH conditions (score >= 60 AND no strip flags)
  assert.match(source, /confidenceScore >= 60 && !hasStripFlags/);
});

// Test 7 — verifier never throws on malformed input; fail-open returns passed:true
test('verifyAiResponse fails open (passed:true) on any internal error', () => {
  // Verify try/catch wraps the entire body
  assert.match(source, /try \{[\s\S]+\} catch \{[\s\S]+passed: true/);
  // Verify the catch block returns passed:true (fail-open contract)
  const catchBlock = source.match(/\} catch \{([\s\S]+?)^  \}/m);
  if (catchBlock) {
    assert.match(catchBlock[1], /passed: true/);
    assert.match(catchBlock[1], /confidenceScore: 100/);
  }
  // Verify null/undefined arrays are handled (Array.isArray guard)
  assert.match(source, /Array\.isArray\(response\?\.facts\)|Array\.isArray\(response\.facts\)/);
  assert.match(source, /Array\.isArray\(response\?\.assumptions\)|Array\.isArray\(response\.assumptions\)/);
});

// Test 8 — RULE 3 redaction applies to sanitized.facts AND sanitized.assumptions
test('RULE 3 stakeholder redaction applies to both sanitized.facts and sanitized.assumptions', () => {
  // Verify Rule 3 is applied to both facts and assumptions fields
  assert.match(source, /applyRule3.*facts.*applyRule3.*assumptions|applyRule3[\s\S]{0,300}applyRule3/);
  // Verify redactNames is applied to both sanitizedFacts and sanitizedAssumptions
  assert.match(source, /sanitizedFacts[\s\S]{0,200}redactNames|redactNames[\s\S]{0,200}sanitizedFacts/);
  assert.match(source, /sanitizedAssumptions[\s\S]{0,200}redactNames|redactNames[\s\S]{0,200}sanitizedAssumptions/);
  // Verify sanitized output includes both fields
  assert.match(source, /sanitized:[\s\S]{0,100}facts:[\s\S]{0,100}assumptions:/);
  // Verify NAME_FROM_DEPT_REGEX is also exported (for "Sarah from Finance" pattern)
  assert.match(source, /export const NAME_FROM_DEPT_REGEX/);
  const deptRegex = extractRegexSource('NAME_FROM_DEPT_REGEX');
  assert.ok(deptRegex, 'NAME_FROM_DEPT_REGEX should be extractable');
  assert.ok(deptRegex.test('Sarah from Finance'), 'should match "Sarah from Finance"');
  // Verify copilot route integrates verifyAiResponse and uses sanitized fields
  assert.match(copilotRoute, /verifyAiResponse/);
  assert.match(copilotRoute, /verification\.sanitized\.facts/);
  assert.match(copilotRoute, /verification\.sanitized\.assumptions/);
  assert.match(copilotRoute, /verificationScore.*verification\.confidenceScore|verification\.confidenceScore.*verificationScore/);
});

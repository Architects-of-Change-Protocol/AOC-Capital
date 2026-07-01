import test from 'node:test'; import assert from 'node:assert/strict'
import { evaluateManualPushEligibility, filterEligibleManualPushProjections } from '../src/lib/dashboard/manual-task-push/push-eligibility-engine.ts'
import { buildManualPushEnvelope, buildManualPushEnvelopes } from '../src/lib/dashboard/manual-task-push/push-envelope-builder.ts'
import { simulateManualTaskPush } from '../src/lib/dashboard/manual-task-push/push-simulation-engine.ts'
import { buildManualTaskPushReport } from '../src/lib/dashboard/manual-task-push/push-report-builder.ts'
import { runDashboardManualTaskPush } from '../src/lib/dashboard/manual-task-push/manual-task-push-runtime.ts'

const basePayload = {
  adapter: 'jira',
  title: 'Resolve critical portfolio risk',
  description: 'A critical risk requiring immediate action.',
  priority: 'highest',
  labels: ['priority:critical', 'lane:risk_management', 'owner:pmo_director'],
  dueHours: 4,
  metadata: {
    actionId: 'act-001',
    executionLane: 'risk_management',
    ownerLane: 'pmo_director',
    escalationRequired: true,
    evidenceRequiredCount: 2,
    source: 'dashboard_risk_engine',
  },
}

const baseProjection = {
  adapter: 'jira',
  actionId: 'act-001',
  valid: true,
  payload: basePayload,
  warnings: [],
  errors: [],
}

const baseRequest = {
  projections: [baseProjection],
  mode: 'dry_run',
  manualTriggerConfirmed: true,
}

const NOW = '2026-05-26T12:00:00.000Z'

// 1. Eligibility passes for valid projection with manual trigger
test('1 eligibility passes for valid projection with manual trigger', () => {
  const result = evaluateManualPushEligibility({ projection: baseProjection, request: baseRequest })
  assert.equal(result.eligible, true)
  assert.ok(result.reasons.some((r) => r.includes('eligible')))
  assert.equal(result.adapter, 'jira')
  assert.equal(result.actionId, 'act-001')
})

// 2. Eligibility fails without manual trigger
test('2 eligibility fails without manual trigger', () => {
  const result = evaluateManualPushEligibility({
    projection: baseProjection,
    request: { ...baseRequest, manualTriggerConfirmed: false },
  })
  assert.equal(result.eligible, false)
  assert.ok(result.reasons.some((r) => r.includes('trigger')))
})

// 3. Eligibility fails for invalid projection
test('3 eligibility fails for invalid projection', () => {
  const invalidProjection = { ...baseProjection, valid: false }
  const result = evaluateManualPushEligibility({ projection: invalidProjection, request: baseRequest })
  assert.equal(result.eligible, false)
  assert.ok(result.reasons.some((r) => r.includes('invalid')))
})

// 4. Eligibility fails without payload
test('4 eligibility fails without payload', () => {
  const noPayload = { ...baseProjection, payload: undefined }
  const result = evaluateManualPushEligibility({ projection: noPayload, request: baseRequest })
  assert.equal(result.eligible, false)
  assert.ok(result.reasons.some((r) => r.includes('payload is missing')))
})

// 5. Eligibility filters by requested adapter
test('5 eligibility filters by requested adapter', () => {
  const result = evaluateManualPushEligibility({
    projection: baseProjection,
    request: { ...baseRequest, requestedAdapters: ['linear', 'asana'] },
  })
  assert.equal(result.eligible, false)
  assert.ok(result.reasons.some((r) => r.includes('Adapter was not requested')))
})

// 6. Eligibility filters by requested action id
test('6 eligibility filters by requested action id', () => {
  const result = evaluateManualPushEligibility({
    projection: baseProjection,
    request: { ...baseRequest, requestedActionIds: ['act-999', 'act-888'] },
  })
  assert.equal(result.eligible, false)
  assert.ok(result.reasons.some((r) => r.includes('Action was not requested')))
})

// 7. Projection warnings carry forward
test('7 projection warnings carry forward to eligibility', () => {
  const projWithWarning = { ...baseProjection, warnings: ['Some upstream warning'] }
  const result = evaluateManualPushEligibility({ projection: projWithWarning, request: baseRequest })
  assert.ok(result.warnings.includes('Some upstream warning'))
})

// 8. Email queue warning is added
test('8 email_queue adapter adds human review warning', () => {
  const emailProjection = {
    ...baseProjection,
    adapter: 'email_queue',
    payload: { ...basePayload, adapter: 'email_queue' },
  }
  const result = evaluateManualPushEligibility({ projection: emailProjection, request: baseRequest })
  assert.ok(result.warnings.some((w) => w.includes('human review')))
})

// 9. Envelope builds for eligible projection
test('9 envelope builds for eligible projection', () => {
  const eligibility = evaluateManualPushEligibility({ projection: baseProjection, request: baseRequest })
  const envelope = buildManualPushEnvelope({ projection: baseProjection, eligibility, request: baseRequest, now: NOW })
  assert.ok(envelope !== null)
  assert.equal(envelope?.adapter, 'jira')
  assert.equal(envelope?.actionId, 'act-001')
  assert.equal(envelope?.createdAt, NOW)
  assert.ok(envelope?.id.startsWith('manual-push:jira:act-001:'))
})

// 10. Envelope skipped for ineligible projection
test('10 envelope returns null for ineligible projection', () => {
  const ineligibleProjection = { ...baseProjection, valid: false }
  const eligibility = evaluateManualPushEligibility({ projection: ineligibleProjection, request: baseRequest })
  const envelope = buildManualPushEnvelope({ projection: ineligibleProjection, eligibility, request: baseRequest, now: NOW })
  assert.equal(envelope, null)
})

// 11. Envelope dry_run status is simulated
test('11 envelope executionStatus is simulated for dry_run', () => {
  const eligibility = evaluateManualPushEligibility({ projection: baseProjection, request: baseRequest })
  const envelope = buildManualPushEnvelope({ projection: baseProjection, eligibility, request: baseRequest, now: NOW })
  assert.equal(envelope?.executionStatus, 'simulated')
  assert.equal(envelope?.mode, 'dry_run')
})

// 12. Envelope ready status is ready
test('12 envelope executionStatus is ready for ready mode', () => {
  const readyRequest = { ...baseRequest, mode: 'ready' }
  const eligibility = evaluateManualPushEligibility({ projection: baseProjection, request: readyRequest })
  const envelope = buildManualPushEnvelope({ projection: baseProjection, eligibility, request: readyRequest, now: NOW })
  assert.equal(envelope?.executionStatus, 'ready')
  assert.equal(envelope?.mode, 'ready')
})

// 13. Simulation dry_run returns simulated external id
test('13 dry_run simulation returns simulated external id', () => {
  const eligibility = evaluateManualPushEligibility({ projection: baseProjection, request: baseRequest })
  const envelope = buildManualPushEnvelope({ projection: baseProjection, eligibility, request: baseRequest, now: NOW })
  const sims = simulateManualTaskPush({ envelopes: [envelope] })
  assert.equal(sims.length, 1)
  assert.equal(sims[0].status, 'simulated')
  assert.ok(sims[0].simulatedExternalId?.startsWith('simulated:jira:act-001'))
  assert.ok(sims[0].message.includes('no external task'))
})

// 14. Simulation ready returns no external id
test('14 ready simulation returns no simulated external id', () => {
  const readyRequest = { ...baseRequest, mode: 'ready' }
  const eligibility = evaluateManualPushEligibility({ projection: baseProjection, request: readyRequest })
  const envelope = buildManualPushEnvelope({ projection: baseProjection, eligibility, request: readyRequest, now: NOW })
  const sims = simulateManualTaskPush({ envelopes: [envelope] })
  assert.equal(sims[0].status, 'ready')
  assert.equal(sims[0].simulatedExternalId, undefined)
  assert.ok(sims[0].message.includes('connector execution'))
})

// 15. Report counts eligible/ineligible
test('15 report counts eligible and ineligible projections', () => {
  const invalidProjection = { ...baseProjection, actionId: 'act-002', valid: false, errors: ['missing title'] }
  const mixedRequest = { ...baseRequest, projections: [baseProjection, invalidProjection] }
  const { eligibilities, envelopes } = buildManualPushEnvelopes({ request: mixedRequest, now: NOW })
  const sims = simulateManualTaskPush({ envelopes })
  const report = buildManualTaskPushReport({ request: mixedRequest, eligibilities, envelopes, simulations: sims, generatedAt: NOW })
  assert.equal(report.totalProjections, 2)
  assert.equal(report.eligibleCount, 1)
  assert.equal(report.ineligibleCount, 1)
  assert.equal(report.envelopeCount, 1)
  assert.equal(report.skippedCount, 1)
})

// 16. Report detects missing manual trigger
test('16 report detects missing manual trigger in warnings and summary', () => {
  const noTriggerRequest = { ...baseRequest, manualTriggerConfirmed: false }
  const { eligibilities, envelopes } = buildManualPushEnvelopes({ request: noTriggerRequest, now: NOW })
  const sims = simulateManualTaskPush({ envelopes })
  const report = buildManualTaskPushReport({ request: noTriggerRequest, eligibilities, envelopes, simulations: sims, generatedAt: NOW })
  assert.ok(report.warnings.some((w) => w.includes('trigger')))
  assert.ok(report.executiveSummary.includes('trigger confirmation'))
  assert.equal(report.envelopeCount, 0)
})

// 17. Runtime dry_run end-to-end
test('17 runtime dry_run end-to-end', () => {
  const report = runDashboardManualTaskPush(baseRequest)
  assert.equal(report.mode, 'dry_run')
  assert.equal(report.totalProjections, 1)
  assert.equal(report.eligibleCount, 1)
  assert.equal(report.envelopeCount, 1)
  assert.equal(report.simulatedCount, 1)
  assert.ok(report.executiveSummary.includes('simulated'))
  assert.ok(report.executiveSummary.includes('no external tasks'))
})

// 18. Runtime ready end-to-end
test('18 runtime ready end-to-end', () => {
  const readyRequest = { ...baseRequest, mode: 'ready', requestedBy: 'pmo-operator' }
  const report = runDashboardManualTaskPush(readyRequest)
  assert.equal(report.mode, 'ready')
  assert.equal(report.envelopeCount, 1)
  assert.ok(report.executiveSummary.includes('prepared'))
  assert.ok(report.executiveSummary.includes('connector execution'))
  assert.equal(report.envelopes[0].requestedBy, 'pmo-operator')
})

// 19. Runtime no eligible projections summary
test('19 runtime produces correct summary when no projections are eligible', () => {
  const emptyRequest = { ...baseRequest, projections: [] }
  const report = runDashboardManualTaskPush(emptyRequest)
  assert.equal(report.envelopeCount, 0)
  assert.ok(report.executiveSummary.includes('No task projections'))
})

// 20. Deterministic envelope id contains adapter/action
test('20 envelope id contains adapter and action id deterministically', () => {
  const eligibility = evaluateManualPushEligibility({ projection: baseProjection, request: baseRequest })
  const e1 = buildManualPushEnvelope({ projection: baseProjection, eligibility, request: baseRequest, now: NOW })
  const e2 = buildManualPushEnvelope({ projection: baseProjection, eligibility, request: baseRequest, now: NOW })
  assert.equal(e1?.id, e2?.id)
  assert.ok(e1?.id.includes('jira'))
  assert.ok(e1?.id.includes('act-001'))
})

// 21. filterEligibleManualPushProjections returns only eligible projections
test('21 filterEligibleManualPushProjections returns eligible projections only', () => {
  const invalid = { ...baseProjection, actionId: 'act-bad', valid: false }
  const req = { ...baseRequest, projections: [baseProjection, invalid] }
  const { eligibilities, eligibleProjections } = filterEligibleManualPushProjections(req)
  assert.equal(eligibilities.length, 2)
  assert.equal(eligibleProjections.length, 1)
  assert.equal(eligibleProjections[0].actionId, 'act-001')
})

// 22. Multi-projection request filters by requestedAdapters
test('22 multi-projection request respects requestedAdapters filter', () => {
  const linearProjection = { ...baseProjection, adapter: 'linear', payload: { ...basePayload, adapter: 'linear' } }
  const req = { ...baseRequest, projections: [baseProjection, linearProjection], requestedAdapters: ['linear'] }
  const { envelopes } = buildManualPushEnvelopes({ request: req, now: NOW })
  assert.equal(envelopes.length, 1)
  assert.equal(envelopes[0].adapter, 'linear')
})

// 23. Eligibility fails when projection has errors
test('23 eligibility fails when projection contains errors', () => {
  const errProjection = { ...baseProjection, errors: ['Title is required'] }
  const result = evaluateManualPushEligibility({ projection: errProjection, request: baseRequest })
  assert.equal(result.eligible, false)
  assert.ok(result.reasons.some((r) => r.includes('errors')))
})

// 24. Report skippedCount equals ineligible projections
test('24 skippedCount equals projections not converted to envelopes', () => {
  const report = runDashboardManualTaskPush(baseRequest)
  assert.equal(report.skippedCount, report.totalProjections - report.envelopeCount)
})

// 25. requestedBy propagates to envelope
test('25 requestedBy propagates from request to envelope', () => {
  const reqWithBy = { ...baseRequest, requestedBy: 'jane.doe@pmfreak.io' }
  const report = runDashboardManualTaskPush(reqWithBy)
  assert.equal(report.envelopes[0].requestedBy, 'jane.doe@pmfreak.io')
})

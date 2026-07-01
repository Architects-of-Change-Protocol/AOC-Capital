import assert from 'node:assert/strict'
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
  labels: ['priority:critical'],
  dueHours: 4,
  metadata: { actionId: 'act-001', executionLane: 'risk_management', ownerLane: 'pmo_director', escalationRequired: true, evidenceRequiredCount: 1, source: 'dashboard' },
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

// eligible projection passes
const elig = evaluateManualPushEligibility({ projection: baseProjection, request: baseRequest })
assert.equal(elig.eligible, true)
assert.ok(elig.reasons.some((r) => r.includes('eligible')))

// missing manual trigger blocks push
const noTrigger = evaluateManualPushEligibility({ projection: baseProjection, request: { ...baseRequest, manualTriggerConfirmed: false } })
assert.equal(noTrigger.eligible, false)
assert.ok(noTrigger.reasons.some((r) => r.includes('trigger')))

// requested adapter filtering works
const filtered = evaluateManualPushEligibility({ projection: baseProjection, request: { ...baseRequest, requestedAdapters: ['linear'] } })
assert.equal(filtered.eligible, false)
assert.ok(filtered.reasons.some((r) => r.includes('Adapter')))

// requested action filtering works
const filteredAction = evaluateManualPushEligibility({ projection: baseProjection, request: { ...baseRequest, requestedActionIds: ['act-999'] } })
assert.equal(filteredAction.eligible, false)
assert.ok(filteredAction.reasons.some((r) => r.includes('Action')))

// envelope builds
const { eligibilities, envelopes } = buildManualPushEnvelopes({ request: baseRequest, now: '2026-05-26T00:00:00.000Z' })
assert.equal(envelopes.length, 1)
assert.ok(envelopes[0].id.includes('jira'))
assert.ok(envelopes[0].id.includes('act-001'))
assert.equal(envelopes[0].executionStatus, 'simulated')

// dry-run simulation works
const simulations = simulateManualTaskPush({ envelopes })
assert.equal(simulations.length, 1)
assert.equal(simulations[0].status, 'simulated')
assert.ok(simulations[0].simulatedExternalId?.includes('simulated:jira'))
assert.ok(simulations[0].message.includes('no external task'))

// ready mode works
const readyRequest = { ...baseRequest, mode: 'ready' }
const { envelopes: readyEnvelopes } = buildManualPushEnvelopes({ request: readyRequest, now: '2026-05-26T00:00:00.000Z' })
const readySims = simulateManualTaskPush({ envelopes: readyEnvelopes })
assert.equal(readyEnvelopes[0].executionStatus, 'ready')
assert.equal(readySims[0].status, 'ready')
assert.equal(readySims[0].simulatedExternalId, undefined)
assert.ok(readySims[0].message.includes('connector execution'))

// runtime report builds
const dryReport = runDashboardManualTaskPush(baseRequest)
assert.equal(dryReport.mode, 'dry_run')
assert.equal(dryReport.totalProjections, 1)
assert.equal(dryReport.eligibleCount, 1)
assert.equal(dryReport.ineligibleCount, 0)
assert.equal(dryReport.envelopeCount, 1)
assert.ok(dryReport.executiveSummary.includes('simulated'))

const readyReport = runDashboardManualTaskPush(readyRequest)
assert.equal(readyReport.mode, 'ready')
assert.ok(readyReport.executiveSummary.includes('prepared'))

console.log('[ok] dashboard manual task push runtime valid')

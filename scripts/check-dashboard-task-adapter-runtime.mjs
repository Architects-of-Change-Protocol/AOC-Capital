import assert from 'node:assert/strict'
import { getDashboardTaskAdapterCapabilities } from '../src/lib/dashboard/task-adapters/adapter-capability-engine.ts'
import { buildDashboardTaskPayload } from '../src/lib/dashboard/task-adapters/task-payload-builder.ts'
import { validateDashboardTaskProjection } from '../src/lib/dashboard/task-adapters/adapter-validator.ts'
import { projectDashboardActionToAdapter, projectDashboardActions } from '../src/lib/dashboard/task-adapters/adapter-projection-engine.ts'
import { buildDashboardTaskProjectionReport } from '../src/lib/dashboard/task-adapters/adapter-report-builder.ts'
import { runDashboardTaskAdapterRuntime } from '../src/lib/dashboard/task-adapters/external-task-adapter-runtime.ts'

const baseAction = {
  id: 'act-001',
  type: 'resolve_portfolio_risk',
  title: 'Resolve critical portfolio risk',
  description: 'A critical risk requiring immediate action.',
  priority: 'critical',
  status: 'proposed',
  ownerLane: 'pmo_director',
  executionLane: 'risk_management',
  affectedProjects: ['p1'],
  source: 'dashboard',
  sla: { responseDueHours: 4, resolutionDueHours: 24, cadence: 'immediate' },
  escalationRoute: { required: true, routeTo: 'pmo_director', reason: 'Critical escalation' },
  evidenceRequired: ['doc-1'],
  rationale: 'Portfolio at risk',
}

// capabilities resolve
assert.equal(getDashboardTaskAdapterCapabilities('jira').supportsPriority, true)
assert.equal(getDashboardTaskAdapterCapabilities('email_queue').supportsDescription, true)
assert.equal(getDashboardTaskAdapterCapabilities('email_queue').supportsPriority, false)
assert.equal(getDashboardTaskAdapterCapabilities('atenea').supportsExecutionLane, true)
assert.equal(getDashboardTaskAdapterCapabilities('atenea').supportsAssignee, false)
assert.equal(getDashboardTaskAdapterCapabilities('linear').supportsDueDate, false)
assert.equal(getDashboardTaskAdapterCapabilities('internal_runtime').supportsAssignee, true)

// payload builds
const jiraPayload = buildDashboardTaskPayload({ adapter: 'jira', action: baseAction })
assert.equal(jiraPayload.title, baseAction.title)
assert.equal(jiraPayload.priority, 'highest')
assert.ok(Array.isArray(jiraPayload.labels))
assert.ok(jiraPayload.labels.includes('priority:critical'))
assert.equal(jiraPayload.dueHours, 4)

const ateneaPayload = buildDashboardTaskPayload({ adapter: 'atenea', action: baseAction })
assert.equal(ateneaPayload.dueHours, undefined)
assert.equal(ateneaPayload.labels, undefined)
assert.ok(ateneaPayload.description.includes('Evidence Required'))

const emailPayload = buildDashboardTaskPayload({ adapter: 'email_queue', action: baseAction })
assert.ok(emailPayload.description.length > 0)
assert.equal(emailPayload.labels, undefined)
assert.equal(emailPayload.priority, '')

// validator works
const valid = validateDashboardTaskProjection({ adapter: 'jira', action: baseAction })
assert.equal(valid.valid, true)
assert.equal(valid.errors.length, 0)

const invalidTitle = validateDashboardTaskProjection({ adapter: 'jira', action: { ...baseAction, title: '' } })
assert.equal(invalidTitle.valid, false)
assert.ok(invalidTitle.errors.some((e) => e.includes('title')))

const invalidDesc = validateDashboardTaskProjection({ adapter: 'jira', action: { ...baseAction, description: '' } })
assert.equal(invalidDesc.valid, false)
assert.ok(invalidDesc.errors.some((e) => e.includes('description')))

const internalAlwaysValid = validateDashboardTaskProjection({ adapter: 'internal_runtime', action: { ...baseAction, title: '', description: '' } })
assert.equal(internalAlwaysValid.valid, true)

const emailWarning = validateDashboardTaskProjection({ adapter: 'email_queue', action: baseAction })
assert.ok(emailWarning.warnings.some((w) => w.includes('Assignee omitted')))

// projections generate
const projection = projectDashboardActionToAdapter({ adapter: 'jira', action: baseAction })
assert.equal(projection.valid, true)
assert.ok(projection.payload !== undefined)
assert.equal(projection.actionId, baseAction.id)

const invalidProjection = projectDashboardActionToAdapter({ adapter: 'jira', action: { ...baseAction, title: '' } })
assert.equal(invalidProjection.valid, false)
assert.equal(invalidProjection.payload, undefined)

const multiProjection = projectDashboardActions({ actions: [baseAction], adapters: ['jira', 'linear', 'asana'] })
assert.equal(multiProjection.length, 3)

// report builds
const request = { actions: [baseAction], adapters: ['jira', 'internal_runtime'] }
const projections = projectDashboardActions(request)
const report = buildDashboardTaskProjectionReport({ request, projections })
assert.equal(report.successfulProjections, 2)
assert.equal(report.failedProjections, 0)
assert.equal(report.totalActions, 1)
assert.equal(report.totalAdapters, 2)
assert.ok(report.executiveSummary.includes('2 successful'))

const failRequest = { actions: [{ ...baseAction, title: '' }], adapters: ['jira'] }
const failProjections = projectDashboardActions(failRequest)
const failReport = buildDashboardTaskProjectionReport({ request: failRequest, projections: failProjections })
assert.equal(failReport.failedProjections, 1)
assert.equal(failReport.successfulProjections, 0)

// runtime end-to-end
const fullReport = runDashboardTaskAdapterRuntime({
  actions: [baseAction],
  adapters: ['jira', 'linear', 'asana', 'clickup', 'email_queue', 'atenea', 'internal_runtime'],
})
assert.equal(fullReport.totalActions, 1)
assert.equal(fullReport.totalAdapters, 7)
assert.equal(fullReport.successfulProjections, 7)
assert.ok(fullReport.executiveSummary.includes('7 adapter(s)'))
assert.equal(fullReport.projections.length, 7)

console.log('[ok] dashboard task adapter runtime valid')

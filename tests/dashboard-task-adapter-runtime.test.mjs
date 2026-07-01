import test from 'node:test'; import assert from 'node:assert/strict'
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
  description: 'A critical risk has been identified in the portfolio requiring immediate action.',
  priority: 'critical',
  status: 'proposed',
  ownerLane: 'pmo_director',
  executionLane: 'risk_management',
  affectedProjects: ['project-alpha', 'project-beta'],
  source: 'dashboard_risk_engine',
  sourceId: 'risk-001',
  sla: { responseDueHours: 4, resolutionDueHours: 24, cadence: 'immediate' },
  escalationRoute: { required: true, routeTo: 'pmo_director', reason: 'Critical escalation required' },
  evidenceRequired: ['risk-assessment-doc', 'mitigation-plan'],
  rationale: 'Portfolio integrity at risk due to missing dependency resolution',
  signal: { severity: 'critical' },
}

// 1. Capability resolution — jira
test('1 jira capabilities full support', () => {
  const cap = getDashboardTaskAdapterCapabilities('jira')
  assert.equal(cap.supportsPriority, true)
  assert.equal(cap.supportsAssignee, true)
  assert.equal(cap.supportsDueDate, true)
  assert.equal(cap.supportsLabels, true)
  assert.equal(cap.supportsDescription, true)
  assert.equal(cap.supportsEscalationMetadata, true)
  assert.equal(cap.supportsEvidenceRequirements, true)
  assert.equal(cap.supportsExecutionLane, true)
})

// 2. Capability resolution — linear
test('2 linear capabilities partial support', () => {
  const cap = getDashboardTaskAdapterCapabilities('linear')
  assert.equal(cap.supportsPriority, true)
  assert.equal(cap.supportsAssignee, true)
  assert.equal(cap.supportsLabels, true)
  assert.equal(cap.supportsDescription, true)
  assert.equal(cap.supportsDueDate, false)
  assert.equal(cap.supportsEscalationMetadata, false)
  assert.equal(cap.supportsEvidenceRequirements, false)
  assert.equal(cap.supportsExecutionLane, false)
})

// 3. Capability resolution — asana
test('3 asana capabilities', () => {
  const cap = getDashboardTaskAdapterCapabilities('asana')
  assert.equal(cap.supportsPriority, true)
  assert.equal(cap.supportsAssignee, true)
  assert.equal(cap.supportsDueDate, true)
  assert.equal(cap.supportsLabels, false)
  assert.equal(cap.supportsEscalationMetadata, false)
})

// 4. Capability resolution — clickup
test('4 clickup capabilities full support', () => {
  const cap = getDashboardTaskAdapterCapabilities('clickup')
  assert.equal(cap.supportsPriority, true)
  assert.equal(cap.supportsExecutionLane, true)
  assert.equal(cap.supportsEvidenceRequirements, true)
  assert.equal(cap.supportsEscalationMetadata, true)
})

// 5. Capability resolution — email_queue
test('5 email_queue capabilities description and escalation only', () => {
  const cap = getDashboardTaskAdapterCapabilities('email_queue')
  assert.equal(cap.supportsDescription, true)
  assert.equal(cap.supportsEscalationMetadata, true)
  assert.equal(cap.supportsPriority, false)
  assert.equal(cap.supportsAssignee, false)
  assert.equal(cap.supportsDueDate, false)
  assert.equal(cap.supportsLabels, false)
})

// 6. Capability resolution — atenea
test('6 atenea capabilities pmfreak-native', () => {
  const cap = getDashboardTaskAdapterCapabilities('atenea')
  assert.equal(cap.supportsPriority, true)
  assert.equal(cap.supportsDescription, true)
  assert.equal(cap.supportsEscalationMetadata, true)
  assert.equal(cap.supportsEvidenceRequirements, true)
  assert.equal(cap.supportsExecutionLane, true)
  assert.equal(cap.supportsAssignee, false)
  assert.equal(cap.supportsDueDate, false)
  assert.equal(cap.supportsLabels, false)
})

// 7. Capability resolution — internal_runtime
test('7 internal_runtime capabilities full support', () => {
  const cap = getDashboardTaskAdapterCapabilities('internal_runtime')
  assert.equal(cap.supportsPriority, true)
  assert.equal(cap.supportsAssignee, true)
  assert.equal(cap.supportsDueDate, true)
  assert.equal(cap.supportsLabels, true)
  assert.equal(cap.supportsDescription, true)
  assert.equal(cap.supportsEscalationMetadata, true)
  assert.equal(cap.supportsEvidenceRequirements, true)
  assert.equal(cap.supportsExecutionLane, true)
})

// 8. Payload build for Jira
test('8 jira payload build', () => {
  const payload = buildDashboardTaskPayload({ adapter: 'jira', action: baseAction })
  assert.equal(payload.adapter, 'jira')
  assert.equal(payload.title, baseAction.title)
  assert.equal(payload.priority, 'highest')
  assert.ok(payload.description.includes(baseAction.description))
  assert.ok(payload.description.includes('Rationale:'))
  assert.ok(payload.description.includes('Owner Lane:'))
  assert.ok(payload.description.includes('Execution Lane:'))
  assert.ok(Array.isArray(payload.labels))
  assert.equal(typeof payload.dueHours, 'number')
  assert.equal(payload.dueHours, 4)
})

// 9. Payload build for Atenea
test('9 atenea payload build', () => {
  const payload = buildDashboardTaskPayload({ adapter: 'atenea', action: baseAction })
  assert.equal(payload.adapter, 'atenea')
  assert.equal(payload.priority, 'highest')
  assert.ok(payload.description.includes('Evidence Required'))
  assert.ok(payload.description.includes('Escalation'))
  assert.equal(payload.labels, undefined)
  assert.equal(payload.dueHours, undefined)
})

// 10. Payload build for email_queue
test('10 email_queue payload build', () => {
  const payload = buildDashboardTaskPayload({ adapter: 'email_queue', action: baseAction })
  assert.equal(payload.adapter, 'email_queue')
  assert.ok(typeof payload.description === 'string')
  assert.ok(payload.description.length > 0)
  assert.equal(payload.labels, undefined)
  assert.equal(payload.dueHours, undefined)
  assert.equal(payload.priority, '')
})

// 11. Validator rejects invalid title
test('11 validator rejects missing title', () => {
  const result = validateDashboardTaskProjection({ adapter: 'jira', action: { ...baseAction, title: '' } })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('title')))
})

// 12. Validator rejects invalid description
test('12 validator rejects missing description', () => {
  const result = validateDashboardTaskProjection({ adapter: 'jira', action: { ...baseAction, description: '' } })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('description')))
})

// 13. Internal runtime always valid
test('13 internal_runtime always valid regardless of missing fields', () => {
  const result = validateDashboardTaskProjection({
    adapter: 'internal_runtime',
    action: { ...baseAction, title: '', description: '' },
  })
  assert.equal(result.valid, true)
  assert.equal(result.errors.length, 0)
})

// 14. Projection builds valid payload
test('14 projection builds valid payload', () => {
  const projection = projectDashboardActionToAdapter({ adapter: 'jira', action: baseAction })
  assert.equal(projection.valid, true)
  assert.ok(projection.payload !== undefined)
  assert.equal(projection.actionId, baseAction.id)
  assert.equal(projection.adapter, 'jira')
  assert.equal(projection.errors.length, 0)
})

// 15. Invalid projection returns errors, no payload
test('15 invalid projection returns errors without payload', () => {
  const projection = projectDashboardActionToAdapter({ adapter: 'jira', action: { ...baseAction, title: '' } })
  assert.equal(projection.valid, false)
  assert.ok(projection.errors.length > 0)
  assert.equal(projection.payload, undefined)
})

// 16. Multi-adapter projection count
test('16 multi-adapter projection count is actions times adapters', () => {
  const request = {
    actions: [baseAction, { ...baseAction, id: 'act-002' }],
    adapters: ['jira', 'linear', 'asana'],
  }
  const projections = projectDashboardActions(request)
  assert.equal(projections.length, 6)
})

// 17. Deterministic ordering
test('17 deterministic ordering is stable across identical requests', () => {
  const request = {
    actions: [baseAction, { ...baseAction, id: 'act-002', title: 'Second action' }],
    adapters: ['jira', 'linear'],
  }
  const p1 = projectDashboardActions(request)
  const p2 = projectDashboardActions(request)
  assert.equal(p1[0].actionId, p2[0].actionId)
  assert.equal(p1[0].adapter, p2[0].adapter)
  assert.equal(p1[1].adapter, p2[1].adapter)
  assert.equal(p1[2].actionId, p2[2].actionId)
})

// 18. Report success counts
test('18 report aggregates successful projections', () => {
  const request = { actions: [baseAction], adapters: ['jira', 'internal_runtime'] }
  const projections = projectDashboardActions(request)
  const report = buildDashboardTaskProjectionReport({ request, projections })
  assert.equal(report.successfulProjections, 2)
  assert.equal(report.failedProjections, 0)
  assert.equal(report.totalActions, 1)
  assert.equal(report.totalAdapters, 2)
})

// 19. Report failure counts
test('19 report aggregates failed projections', () => {
  const invalidAction = { ...baseAction, title: '' }
  const request = { actions: [invalidAction], adapters: ['jira', 'linear'] }
  const projections = projectDashboardActions(request)
  const report = buildDashboardTaskProjectionReport({ request, projections })
  assert.equal(report.failedProjections, 2)
  assert.equal(report.successfulProjections, 0)
})

// 20. Runtime end-to-end
test('20 runtime end-to-end all adapters', () => {
  const report = runDashboardTaskAdapterRuntime({
    actions: [baseAction],
    adapters: ['jira', 'linear', 'asana', 'clickup', 'email_queue', 'atenea', 'internal_runtime'],
  })
  assert.equal(report.totalActions, 1)
  assert.equal(report.totalAdapters, 7)
  assert.equal(report.successfulProjections, 7)
  assert.equal(report.failedProjections, 0)
  assert.ok(report.executiveSummary.includes('1 dashboard action(s)'))
  assert.ok(report.executiveSummary.includes('7 adapter(s)'))
  assert.ok(report.executiveSummary.includes('7 successful'))
})

// 21. Labels map correctly
test('21 labels include priority lane and owner tags', () => {
  const payload = buildDashboardTaskPayload({ adapter: 'jira', action: baseAction })
  assert.ok(payload.labels?.includes(`priority:${baseAction.priority}`))
  assert.ok(payload.labels?.includes(`lane:${baseAction.executionLane}`))
  assert.ok(payload.labels?.includes(`owner:${baseAction.ownerLane}`))
})

// 22. Due date omitted when adapter does not support it
test('22 dueHours omitted when adapter unsupported', () => {
  const linearPayload = buildDashboardTaskPayload({ adapter: 'linear', action: baseAction })
  assert.equal(linearPayload.dueHours, undefined)
  const jiraPayload = buildDashboardTaskPayload({ adapter: 'jira', action: baseAction })
  assert.equal(jiraPayload.dueHours, 4)
})

// 23. Metadata integrity
test('23 metadata carries action context', () => {
  const payload = buildDashboardTaskPayload({ adapter: 'jira', action: baseAction })
  assert.equal(payload.metadata.actionId, baseAction.id)
  assert.equal(payload.metadata.executionLane, baseAction.executionLane)
  assert.equal(payload.metadata.ownerLane, baseAction.ownerLane)
  assert.equal(payload.metadata.escalationRequired, baseAction.escalationRoute.required)
  assert.equal(payload.metadata.evidenceRequiredCount, baseAction.evidenceRequired.length)
  assert.equal(payload.metadata.source, baseAction.source)
})

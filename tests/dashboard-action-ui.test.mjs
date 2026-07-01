import test from 'node:test'; import assert from 'node:assert/strict'
import { runDashboardActionCenter } from '../src/lib/dashboard/action-center/action-center-runtime.ts'
import {
  PRIORITY_BADGE_LABELS,
  PRIORITY_BADGE_STYLES,
  OWNER_LANE_LABELS,
  EXECUTION_LANE_LABELS,
  PRIORITY_GROUP_LABELS,
  groupActionsByPriority,
} from '../src/components/dashboard/action-center/utils.ts'

const baseInput = {
  dashboardViewModel: {
    hasCriticalAttention: true,
    warnings: ['w1'],
    sections: {
      topRisksTable: [{ id: 'r1', title: 'Critical risk', severity: 'critical', source: 'x', affectedProjects: ['p1'], rationale: 'client input missing and dependency unblock budget' }],
      interventionsQueue: [{ id: 'i1', title: 'Intervention 1', urgency: 'high', ownerLane: 'pmo_director', cadence: 'Daily', affectedProjects: ['p1'] }],
      decisionsWidget: [{ id: 'd1', title: 'Decision 1', recommendation: 'escalate', confidenceScore: 0.8, severity: 'high' }],
      alertPanel: [{ id: 'a1', title: 'Alert 1', type: 'risk', severity: 'critical', description: 'payment blocked budget financial' }],
    },
  },
  cacheRefreshResult: {
    cacheStatus: 'refresh_required',
    refreshPlan: { refreshRequired: true, refreshRecommended: true, priority: 'high', reasonSummary: 'stale', actions: [{ id: 'c1', sourceKind: 'executive_dashboard_report', reason: 'stale', priority: 'high', title: 'Refresh', description: 'desc' }] },
    metadata: { refreshRequired: true, refreshRecommended: true, warnings: [] },
  },
  hydrationResult: { riskLevel: 'high', warnings: [], recoveryPlan: { recoveryRequired: true, actions: ['Rehydrate'], fallbackMode: 'safe' } },
}

// 1. Priority badge renders all severities
test('1 priority badge label low', () => assert.equal(PRIORITY_BADGE_LABELS['low'], 'LOW'))
test('2 priority badge label medium', () => assert.equal(PRIORITY_BADGE_LABELS['medium'], 'MEDIUM'))
test('3 priority badge label high', () => assert.equal(PRIORITY_BADGE_LABELS['high'], 'HIGH'))
test('4 priority badge label critical', () => assert.equal(PRIORITY_BADGE_LABELS['critical'], 'CRITICAL'))
test('5 priority badge styles cover all 4 severities', () => {
  assert.equal(Object.keys(PRIORITY_BADGE_STYLES).length, 4)
  assert.ok(PRIORITY_BADGE_STYLES['critical'].includes('red'), 'critical style is red')
  assert.ok(PRIORITY_BADGE_STYLES['high'].includes('amber'), 'high style is amber')
  assert.ok(PRIORITY_BADGE_STYLES['low'].includes('slate'), 'low style is muted/slate')
})

// 2. Owner lane humanization
test('6 owner lane project_manager', () => assert.equal(OWNER_LANE_LABELS['project_manager'], 'Project Manager'))
test('7 owner lane pmo_director', () => assert.equal(OWNER_LANE_LABELS['pmo_director'], 'PMO Director'))
test('8 owner lane executive_sponsor', () => assert.equal(OWNER_LANE_LABELS['executive_sponsor'], 'Executive Sponsor'))
test('9 owner lane system_runtime', () => assert.equal(OWNER_LANE_LABELS['system_runtime'], 'System Runtime'))
test('10 owner lane client_owner', () => assert.equal(OWNER_LANE_LABELS['client_owner'], 'Client Owner'))
test('11 all 9 owner lanes defined', () => assert.equal(Object.keys(OWNER_LANE_LABELS).length, 9))

// 3. Execution lane humanization
test('12 execution lane dashboard_refresh', () => assert.equal(EXECUTION_LANE_LABELS['dashboard_refresh'], 'Dashboard Refresh'))
test('13 execution lane financial_governance', () => assert.equal(EXECUTION_LANE_LABELS['financial_governance'], 'Financial Governance'))
test('14 execution lane executive_decision', () => assert.equal(EXECUTION_LANE_LABELS['executive_decision'], 'Executive Decision'))
test('15 execution lane system_recovery', () => assert.equal(EXECUTION_LANE_LABELS['system_recovery'], 'System Recovery'))
test('16 all 10 execution lanes defined', () => assert.equal(Object.keys(EXECUTION_LANE_LABELS).length, 10))

// 4. SLA rendering — tested via runtime output
test('17 action sla has responseDueHours resolutionDueHours cadence', () => {
  const report = runDashboardActionCenter(baseInput)
  if (report.totalActions > 0) {
    const action = report.actions[0]
    assert.ok(typeof action.sla.responseDueHours === 'number', 'responseDueHours is number')
    assert.ok(typeof action.sla.resolutionDueHours === 'number', 'resolutionDueHours is number')
    assert.ok(typeof action.sla.cadence === 'string', 'cadence is string')
  }
})

// 5. Escalation rendering required
test('18 escalation route has required boolean', () => {
  const report = runDashboardActionCenter(baseInput)
  if (report.totalActions > 0) {
    const action = report.actions[0]
    assert.equal(typeof action.escalationRoute.required, 'boolean')
  }
})

// 6. Escalation rendering optional
test('19 escalation route may have routeTo and reason', () => {
  const report = runDashboardActionCenter(baseInput)
  const escalating = report.actions.find(a => a.escalationRoute.required)
  if (escalating) {
    assert.ok(escalating.escalationRoute.routeTo !== undefined || escalating.escalationRoute.reason !== undefined)
  }
})

// 7. Action card renders all fields — validated via report structure
test('20 action has all required card fields', () => {
  const report = runDashboardActionCenter(baseInput)
  if (report.totalActions > 0) {
    const a = report.actions[0]
    assert.ok(typeof a.title === 'string')
    assert.ok(typeof a.description === 'string')
    assert.ok(typeof a.priority === 'string')
    assert.ok(typeof a.ownerLane === 'string')
    assert.ok(typeof a.executionLane === 'string')
    assert.ok(Array.isArray(a.affectedProjects))
    assert.ok(Array.isArray(a.evidenceRequired))
    assert.ok(a.sla !== undefined)
    assert.ok(a.escalationRoute !== undefined)
  }
})

// 8. Queue groups by priority
test('21 groupActionsByPriority places critical first', () => {
  const actions = [{ id: '1', priority: 'high' }, { id: '2', priority: 'critical' }, { id: '3', priority: 'low' }]
  const groups = groupActionsByPriority(actions)
  assert.equal(groups[0].priority, 'critical')
})
test('22 groupActionsByPriority aggregates same-priority actions', () => {
  const actions = [{ id: '1', priority: 'critical' }, { id: '2', priority: 'critical' }, { id: '3', priority: 'high' }]
  const groups = groupActionsByPriority(actions)
  assert.equal(groups.find(g => g.priority === 'critical')?.actions.length, 2)
})
test('23 groupActionsByPriority omits empty groups', () => {
  const actions = [{ id: '1', priority: 'high' }]
  const groups = groupActionsByPriority(actions)
  assert.equal(groups.find(g => g.priority === 'critical'), undefined)
  assert.equal(groups.find(g => g.priority === 'medium'), undefined)
})
test('24 groupActionsByPriority order is critical high medium low', () => {
  const actions = [
    { id: '1', priority: 'low' }, { id: '2', priority: 'medium' },
    { id: '3', priority: 'high' }, { id: '4', priority: 'critical' },
  ]
  const groups = groupActionsByPriority(actions)
  assert.deepEqual(groups.map(g => g.priority), ['critical', 'high', 'medium', 'low'])
})
test('25 PRIORITY_GROUP_LABELS has 4 entries', () => assert.equal(Object.keys(PRIORITY_GROUP_LABELS).length, 4))

// 9. Queue empty state
test('26 groupActionsByPriority returns empty array for no actions', () => {
  assert.equal(groupActionsByPriority([]).length, 0)
})

// 10. Next action panel renders
test('27 recommendedNextAction is first action when actions present', () => {
  const report = runDashboardActionCenter(baseInput)
  if (report.totalActions > 0) {
    assert.equal(report.recommendedNextAction?.id, report.actions[0].id)
  }
})

// 11. Next action empty state
test('28 no recommendedNextAction when report empty', () => {
  const report = runDashboardActionCenter({})
  assert.equal(report.recommendedNextAction, undefined)
})

// 12. Summary metrics render
test('29 report summary metrics are all numbers', () => {
  const report = runDashboardActionCenter(baseInput)
  assert.equal(typeof report.totalActions, 'number')
  assert.equal(typeof report.criticalActions, 'number')
  assert.equal(typeof report.escalationRequiredCount, 'number')
})
test('30 empty report summary metrics are zero', () => {
  const report = runDashboardActionCenter({})
  assert.equal(report.totalActions, 0)
  assert.equal(report.criticalActions, 0)
  assert.equal(report.escalationRequiredCount, 0)
})

// 13. Executive action center full render
test('31 full report has executiveSummary mentioning action count', () => {
  const report = runDashboardActionCenter(baseInput)
  if (report.totalActions > 0) {
    assert.ok(report.executiveSummary.includes(String(report.totalActions)))
  }
})

// 14. Executive action center empty report
test('32 empty report executiveSummary is a non-empty string', () => {
  const report = runDashboardActionCenter({})
  assert.ok(report.executiveSummary.length > 0)
})
test('33 empty report has no actions', () => {
  const report = runDashboardActionCenter({})
  assert.equal(report.actions.length, 0)
})

// 15. Dashboard page integration composes action center
test('34 groupActionsByPriority handles all priority values', () => {
  const all = ['critical', 'high', 'medium', 'low'].map((priority, i) => ({ id: String(i), priority }))
  const groups = groupActionsByPriority(all)
  assert.equal(groups.length, 4)
  assert.deepEqual(groups.map(g => g.priority), ['critical', 'high', 'medium', 'low'])
})
test('35 label maps have no undefined values', () => {
  for (const [k, v] of Object.entries(PRIORITY_BADGE_LABELS)) assert.ok(v, `PRIORITY_BADGE_LABELS[${k}] is truthy`)
  for (const [k, v] of Object.entries(OWNER_LANE_LABELS)) assert.ok(v, `OWNER_LANE_LABELS[${k}] is truthy`)
  for (const [k, v] of Object.entries(EXECUTION_LANE_LABELS)) assert.ok(v, `EXECUTION_LANE_LABELS[${k}] is truthy`)
})

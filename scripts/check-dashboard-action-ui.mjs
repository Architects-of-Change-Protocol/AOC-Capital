import assert from 'node:assert/strict'
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
      topRisksTable: [{ id: 'r1', title: 'Critical risk', severity: 'critical', source: 'x', affectedProjects: ['p1'], rationale: 'dependency unblock missing input' }],
      interventionsQueue: [{ id: 'i1', title: 'Intervention 1', urgency: 'high', ownerLane: 'pmo_director', cadence: 'Daily', affectedProjects: ['p1'] }],
      decisionsWidget: [{ id: 'd1', title: 'Decision 1', recommendation: 'escalate', confidenceScore: 0.8, severity: 'high' }],
      alertPanel: [{ id: 'a1', title: 'Alert 1', type: 'risk', severity: 'critical', description: 'payment blocked budget' }],
    },
  },
  cacheRefreshResult: {
    cacheStatus: 'refresh_required',
    refreshPlan: { refreshRequired: true, refreshRecommended: true, priority: 'high', reasonSummary: 'stale', actions: [{ id: 'c1', sourceKind: 'executive_dashboard_report', reason: 'stale', priority: 'high', title: 'Refresh source', description: 'desc' }] },
    metadata: { refreshRequired: true, refreshRecommended: true, warnings: [] },
  },
}

// Summary renders
const report = runDashboardActionCenter(baseInput)
assert.equal(typeof report.totalActions, 'number', 'totalActions is a number')
assert.equal(typeof report.criticalActions, 'number', 'criticalActions is a number')
assert.equal(typeof report.escalationRequiredCount, 'number', 'escalationRequiredCount is a number')
assert.equal(typeof report.executiveSummary, 'string', 'executiveSummary is a string')

// Next action panel - recommended action present
if (report.totalActions > 0) {
  assert.ok(report.recommendedNextAction, 'recommendedNextAction present when actions exist')
  assert.equal(typeof report.recommendedNextAction.title, 'string', 'recommended action has title')
}

// Queue groups actions
const mockActions = [
  { id: '1', priority: 'critical', title: 'A' },
  { id: '2', priority: 'high', title: 'B' },
  { id: '3', priority: 'critical', title: 'C' },
  { id: '4', priority: 'low', title: 'D' },
]
const groups = groupActionsByPriority(mockActions)
const criticalGroup = groups.find(g => g.priority === 'critical')
assert.equal(criticalGroup?.actions.length, 2, 'critical group has 2 actions')
assert.equal(groups[0].priority, 'critical', 'critical group is first')
assert.equal(groups.find(g => g.priority === 'medium'), undefined, 'no medium group when empty')

// Empty state renders
const emptyReport = runDashboardActionCenter({})
assert.equal(emptyReport.totalActions, 0, 'empty report has 0 total actions')
assert.equal(typeof emptyReport.executiveSummary, 'string', 'empty report has summary string')
assert.equal(emptyReport.recommendedNextAction, undefined, 'no recommended action when empty')

// Label map coverage
assert.equal(Object.keys(PRIORITY_BADGE_LABELS).length, 4, 'all 4 priority labels defined')
assert.equal(Object.keys(PRIORITY_BADGE_STYLES).length, 4, 'all 4 priority styles defined')
assert.equal(Object.keys(OWNER_LANE_LABELS).length, 9, 'all 9 owner lane labels defined')
assert.equal(Object.keys(EXECUTION_LANE_LABELS).length, 10, 'all 10 execution lane labels defined')
assert.equal(Object.keys(PRIORITY_GROUP_LABELS).length, 4, 'all 4 priority group labels defined')

console.log('[ok] dashboard action ui valid')

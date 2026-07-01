import test from 'node:test'
import assert from 'node:assert/strict'

import { adaptPortfolioHealthPanel } from '../src/lib/dashboard/runtime-integration/portfolio-health-adapter.ts'
import { adaptExecutiveSummaryCard } from '../src/lib/dashboard/runtime-integration/executive-summary-adapter.ts'
import { adaptRiskTable } from '../src/lib/dashboard/runtime-integration/risk-table-adapter.ts'
import { adaptDecisionWidget } from '../src/lib/dashboard/runtime-integration/decision-widget-adapter.ts'
import { adaptInterventionQueue } from '../src/lib/dashboard/runtime-integration/intervention-queue-adapter.ts'
import { adaptAlertPanel } from '../src/lib/dashboard/runtime-integration/alert-panel-adapter.ts'
import { buildPortfolioExecutiveDashboardDTO } from '../src/lib/dashboard/runtime-integration/dashboard-dto-builder.ts'
import { runDashboardRuntimeIntegration } from '../src/lib/dashboard/runtime-integration/dashboard-runtime-integration.ts'

const makeHealthSummary = (score) => ({
  portfolioHealthScore: score,
  averageProjectHealthScore: score - 4,
  activeProjectCount: 4,
  criticalProjectCount: score < 65 ? 2 : 0,
  riskLevel: score < 65 ? 'high' : 'low',
  summary: `Portfolio health at ${score}.`,
})

const baseReport = (score) => ({
  generatedAt: new Date().toISOString(),
  healthSummary: makeHealthSummary(score),
  conflictSummary: { conflictsDetected: 0, criticalConflicts: 0, topConflictTypes: [], executiveEscalationsRequired: 0, summary: '' },
  loadSummary: { currentBalancingScore: 60, operationalRiskLevel: 'low', projectedImprovement: 5, topBalancingActions: [], summary: '' },
  decisionSummary: { totalDecisionsSimulated: 0, approvalsRecommended: 0, escalationsRecommended: 0, rejectionsRecommended: 0, averageConfidenceScore: 0, topDecisionItems: [], summary: '' },
  interventionSummary: { totalInterventions: 0, criticalInterventions: 0, escalationCount: 0, topInterventionTypes: [], topOwnerLanes: [], summary: '' },
  topRisks: [],
  topDecisionsNeeded: [],
  executiveAttentionAreas: [],
  portfolioRecommendation: 'Monitor portfolio health.',
  executiveSummary: 'Portfolio is in acceptable condition.',
})

// ──────────────────────────────────────────────
// 1. Health panel adaptation
// ──────────────────────────────────────────────

test('health panel: score 85 maps to healthy status', () => {
  const result = adaptPortfolioHealthPanel(baseReport(85))
  assert.equal(result.score, 85)
  assert.equal(result.status, 'healthy')
  assert.equal(result.trend, 'Stable governance posture')
})

test('health panel: score 72 maps to attention status', () => {
  const result = adaptPortfolioHealthPanel(baseReport(72))
  assert.equal(result.status, 'attention')
  assert.equal(result.trend, 'Emerging portfolio pressure')
})

test('health panel: score 52 maps to critical status', () => {
  const result = adaptPortfolioHealthPanel(baseReport(52))
  assert.equal(result.status, 'critical')
  assert.equal(result.trend, 'Immediate executive intervention required')
})

test('health panel: score 80 is exactly healthy boundary', () => {
  const result = adaptPortfolioHealthPanel(baseReport(80))
  assert.equal(result.status, 'healthy')
})

test('health panel: score 65 is exactly attention boundary', () => {
  const result = adaptPortfolioHealthPanel(baseReport(65))
  assert.equal(result.status, 'attention')
})

test('health panel: score 64 falls into critical', () => {
  const result = adaptPortfolioHealthPanel(baseReport(64))
  assert.equal(result.status, 'critical')
})

test('health panel: label comes from healthSummary.summary', () => {
  const result = adaptPortfolioHealthPanel(baseReport(75))
  assert.ok(result.label.includes('75'))
})

test('health panel: missing report returns score 0 and critical status', () => {
  const result = adaptPortfolioHealthPanel(null)
  assert.equal(result.score, 0)
  assert.equal(result.status, 'critical')
})

// ──────────────────────────────────────────────
// 2. Executive summary adaptation
// ──────────────────────────────────────────────

test('executive summary: title is always Portfolio Executive Summary', () => {
  const result = adaptExecutiveSummaryCard(baseReport(75))
  assert.equal(result.title, 'Portfolio Executive Summary')
})

test('executive summary: status healthy for score >= 80', () => {
  const result = adaptExecutiveSummaryCard(baseReport(82))
  assert.equal(result.status, 'healthy')
})

test('executive summary: status attention for score 65–79', () => {
  const result = adaptExecutiveSummaryCard(baseReport(70))
  assert.equal(result.status, 'attention')
})

test('executive summary: status critical for score < 65', () => {
  const result = adaptExecutiveSummaryCard(baseReport(60))
  assert.equal(result.status, 'critical')
})

test('executive summary: summary comes from executiveSummary field', () => {
  const report = { ...baseReport(75), executiveSummary: 'Portfolio is stable with minor pressure.' }
  const result = adaptExecutiveSummaryCard(report)
  assert.equal(result.summary, 'Portfolio is stable with minor pressure.')
})

test('executive summary: recommendation comes from portfolioRecommendation field', () => {
  const report = { ...baseReport(75), portfolioRecommendation: 'Approve reallocation.' }
  const result = adaptExecutiveSummaryCard(report)
  assert.equal(result.recommendation, 'Approve reallocation.')
})

// ──────────────────────────────────────────────
// 3. Risk table mapping
// ──────────────────────────────────────────────

test('risk table: maps critical riskLevel to critical severity', () => {
  const report = {
    ...baseReport(60),
    topRisks: [{ id: 'r1', title: 'High Risk', riskLevel: 'critical', source: 'conflict', affectedProjects: ['alpha'], rationale: 'Bad.' }],
  }
  const rows = adaptRiskTable(report)
  assert.equal(rows[0].severity, 'critical')
})

test('risk table: maps high riskLevel to warning severity', () => {
  const report = {
    ...baseReport(60),
    topRisks: [{ id: 'r1', title: 'High Risk', riskLevel: 'high', source: 'load', affectedProjects: [], rationale: '' }],
  }
  const rows = adaptRiskTable(report)
  assert.equal(rows[0].severity, 'warning')
})

test('risk table: maps moderate riskLevel to warning severity', () => {
  const report = {
    ...baseReport(60),
    topRisks: [{ id: 'r1', title: 'Moderate Risk', riskLevel: 'moderate', source: 'portfolio', affectedProjects: [], rationale: '' }],
  }
  const rows = adaptRiskTable(report)
  assert.equal(rows[0].severity, 'warning')
})

test('risk table: maps low riskLevel to info severity', () => {
  const report = {
    ...baseReport(80),
    topRisks: [{ id: 'r1', title: 'Low Risk', riskLevel: 'low', source: 'portfolio', affectedProjects: [], rationale: '' }],
  }
  const rows = adaptRiskTable(report)
  assert.equal(rows[0].severity, 'info')
})

test('risk table: caps at 10 rows', () => {
  const risks = Array.from({ length: 15 }, (_, i) => ({
    id: `r${i}`,
    title: `Risk ${i}`,
    riskLevel: 'low',
    source: 'portfolio',
    affectedProjects: [],
    rationale: '',
  }))
  const report = { ...baseReport(80), topRisks: risks }
  const rows = adaptRiskTable(report)
  assert.equal(rows.length, 10)
})

test('risk table: returns empty array when topRisks missing', () => {
  const rows = adaptRiskTable(baseReport(80))
  assert.equal(rows.length, 0)
})

// ──────────────────────────────────────────────
// 4. Decision widget mapping
// ──────────────────────────────────────────────

test('decision widget: approve with confidence 84 maps to info', () => {
  const items = adaptDecisionWidget([
    { decisionId: 'd1', recommendation: 'approve', confidenceScore: 84, executiveSummary: 'Approve it.', decisionType: 'resource_reallocation' },
  ])
  assert.equal(items[0].severity, 'info')
})

test('decision widget: approve_with_conditions with confidence 90 maps to info', () => {
  const items = adaptDecisionWidget([
    { decisionId: 'd1', recommendation: 'approve_with_conditions', confidenceScore: 90, executiveSummary: 'Approve with conditions.', decisionType: 'budget_hold' },
  ])
  assert.equal(items[0].severity, 'info')
})

test('decision widget: escalate maps to critical regardless of confidence', () => {
  const items = adaptDecisionWidget([
    { decisionId: 'd1', recommendation: 'escalate', confidenceScore: 91, executiveSummary: 'Escalate.', decisionType: 'timeline_delay' },
  ])
  assert.equal(items[0].severity, 'critical')
})

test('decision widget: reject maps to critical', () => {
  const items = adaptDecisionWidget([
    { decisionId: 'd1', recommendation: 'reject', confidenceScore: 30, executiveSummary: 'Reject.', decisionType: 'scope_expansion' },
  ])
  assert.equal(items[0].severity, 'critical')
})

test('decision widget: approve with confidence 70 maps to warning', () => {
  const items = adaptDecisionWidget([
    { decisionId: 'd1', recommendation: 'approve', confidenceScore: 70, executiveSummary: 'Approve cautiously.', decisionType: 'resource_reallocation' },
  ])
  assert.equal(items[0].severity, 'warning')
})

test('decision widget: caps at 8 items', () => {
  const reports = Array.from({ length: 12 }, (_, i) => ({
    decisionId: `d${i}`,
    recommendation: 'approve',
    confidenceScore: 85,
    executiveSummary: `Decision ${i}`,
    decisionType: 'resource_reallocation',
  }))
  const items = adaptDecisionWidget(reports)
  assert.equal(items.length, 8)
})

test('decision widget: returns empty for undefined input', () => {
  const items = adaptDecisionWidget(undefined)
  assert.equal(items.length, 0)
})

// ──────────────────────────────────────────────
// 5. Intervention queue sorting
// ──────────────────────────────────────────────

test('intervention queue: sorts critical before high before medium before low', () => {
  const interventionReport = {
    interventions: [
      { id: 'i1', title: 'Low Int', urgency: 'low', ownerLane: 'project_manager', recommendedCadence: 'monthly', affectedProjects: [] },
      { id: 'i2', title: 'Critical Int', urgency: 'critical', ownerLane: 'pmo_director', recommendedCadence: 'immediate', affectedProjects: ['alpha'] },
      { id: 'i3', title: 'High Int', urgency: 'high', ownerLane: 'technical_lead', recommendedCadence: 'weekly', affectedProjects: [] },
      { id: 'i4', title: 'Medium Int', urgency: 'medium', ownerLane: 'project_manager', recommendedCadence: 'biweekly', affectedProjects: [] },
    ],
  }
  const queue = adaptInterventionQueue(interventionReport)
  assert.equal(queue[0].id, 'i2')
  assert.equal(queue[1].id, 'i3')
  assert.equal(queue[2].id, 'i4')
  assert.equal(queue[3].id, 'i1')
})

test('intervention queue: critical urgency maps to critical severity', () => {
  const interventionReport = {
    interventions: [{ id: 'i1', title: 'Critical', urgency: 'critical', ownerLane: 'pmo_director', recommendedCadence: 'now', affectedProjects: [] }],
  }
  const queue = adaptInterventionQueue(interventionReport)
  assert.equal(queue[0].urgency, 'critical')
})

test('intervention queue: high urgency maps to warning severity', () => {
  const interventionReport = {
    interventions: [{ id: 'i1', title: 'High', urgency: 'high', ownerLane: 'technical_lead', recommendedCadence: 'weekly', affectedProjects: [] }],
  }
  const queue = adaptInterventionQueue(interventionReport)
  assert.equal(queue[0].urgency, 'warning')
})

test('intervention queue: medium urgency maps to warning severity', () => {
  const interventionReport = {
    interventions: [{ id: 'i1', title: 'Medium', urgency: 'medium', ownerLane: 'project_manager', recommendedCadence: 'biweekly', affectedProjects: [] }],
  }
  const queue = adaptInterventionQueue(interventionReport)
  assert.equal(queue[0].urgency, 'warning')
})

test('intervention queue: low urgency maps to info severity', () => {
  const interventionReport = {
    interventions: [{ id: 'i1', title: 'Low', urgency: 'low', ownerLane: 'project_manager', recommendedCadence: 'monthly', affectedProjects: [] }],
  }
  const queue = adaptInterventionQueue(interventionReport)
  assert.equal(queue[0].urgency, 'info')
})

test('intervention queue: caps at 15 items', () => {
  const interventions = Array.from({ length: 20 }, (_, i) => ({
    id: `i${i}`,
    title: `Int ${i}`,
    urgency: 'low',
    ownerLane: 'project_manager',
    recommendedCadence: 'monthly',
    affectedProjects: [],
  }))
  const queue = adaptInterventionQueue({ interventions })
  assert.equal(queue.length, 15)
})

test('intervention queue: returns empty for null report', () => {
  const queue = adaptInterventionQueue(null)
  assert.equal(queue.length, 0)
})

// ──────────────────────────────────────────────
// 6. Alert panel generation
// ──────────────────────────────────────────────

test('alert panel: generates conflict alert for critical conflicts', () => {
  const conflictReport = {
    conflicts: [{ id: 'c1', type: 'resource_contention', severity: 'critical', description: 'Platform over-allocated.' }],
  }
  const alerts = adaptAlertPanel(baseReport(80), undefined, undefined, conflictReport)
  const conflictAlert = alerts.find((a) => a.type === 'conflict')
  assert.ok(conflictAlert)
  assert.equal(conflictAlert.severity, 'critical')
})

test('alert panel: skips non-critical conflicts', () => {
  const conflictReport = {
    conflicts: [{ id: 'c1', type: 'budget_pressure', severity: 'moderate', description: 'Minor drift.' }],
  }
  const alerts = adaptAlertPanel(baseReport(80), undefined, undefined, conflictReport)
  assert.equal(alerts.length, 0)
})

test('alert panel: generates intervention alert for critical interventions', () => {
  const interventionReport = {
    interventions: [{ id: 'i1', title: 'Emergency reallocation', urgency: 'critical', rationale: 'Urgent action needed.' }],
  }
  const alerts = adaptAlertPanel(baseReport(80), interventionReport)
  const intAlert = alerts.find((a) => a.type === 'intervention')
  assert.ok(intAlert)
  assert.equal(intAlert.severity, 'critical')
})

test('alert panel: generates decision alert for escalate recommendation', () => {
  const decisions = [
    { decisionId: 'd1', recommendation: 'escalate', executiveSummary: 'Escalate board decision.', recommendationRationale: 'Board approval needed.' },
  ]
  const alerts = adaptAlertPanel(baseReport(80), undefined, decisions)
  const decisionAlert = alerts.find((a) => a.type === 'decision')
  assert.ok(decisionAlert)
  assert.equal(decisionAlert.severity, 'critical')
})

test('alert panel: generates decision alert for reject recommendation', () => {
  const decisions = [
    { decisionId: 'd1', recommendation: 'reject', executiveSummary: 'Reject the proposal.', recommendationRationale: 'Too risky.' },
  ]
  const alerts = adaptAlertPanel(baseReport(80), undefined, decisions)
  const decisionAlert = alerts.find((a) => a.type === 'decision')
  assert.ok(decisionAlert)
})

test('alert panel: generates health alert when score is critical', () => {
  const alerts = adaptAlertPanel(baseReport(50))
  const healthAlert = alerts.find((a) => a.type === 'health')
  assert.ok(healthAlert)
  assert.equal(healthAlert.severity, 'critical')
})

test('alert panel: no health alert when score is attention', () => {
  const alerts = adaptAlertPanel(baseReport(70))
  const healthAlert = alerts.find((a) => a.type === 'health')
  assert.equal(healthAlert, undefined)
})

test('alert panel: caps at 12 alerts', () => {
  const conflicts = Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, type: 'resource_contention', severity: 'critical', description: 'Conflict.' }))
  const interventions = Array.from({ length: 8 }, (_, i) => ({ id: `i${i}`, title: `Int ${i}`, urgency: 'critical', rationale: 'Urgent.' }))
  const decisions = Array.from({ length: 8 }, (_, i) => ({ decisionId: `d${i}`, recommendation: 'escalate', executiveSummary: `Decision ${i}`, recommendationRationale: 'Needed.' }))
  const alerts = adaptAlertPanel(
    baseReport(50),
    { interventions },
    decisions,
    { conflicts },
  )
  assert.equal(alerts.length, 12)
})

// ──────────────────────────────────────────────
// 7. DTO builder output
// ──────────────────────────────────────────────

test('DTO builder: returns all six panel keys', () => {
  const dto = buildPortfolioExecutiveDashboardDTO({ executiveDashboardReport: baseReport(75) })
  assert.ok('portfolioHealthPanel' in dto)
  assert.ok('executiveSummaryCard' in dto)
  assert.ok('topRisksTable' in dto)
  assert.ok('decisionsWidget' in dto)
  assert.ok('interventionsQueue' in dto)
  assert.ok('alertPanel' in dto)
})

test('DTO builder: decisionsWidget is empty array when no reports provided', () => {
  const dto = buildPortfolioExecutiveDashboardDTO({ executiveDashboardReport: baseReport(75) })
  assert.deepEqual(dto.decisionsWidget, [])
})

test('DTO builder: interventionsQueue is empty array when no report provided', () => {
  const dto = buildPortfolioExecutiveDashboardDTO({ executiveDashboardReport: baseReport(75) })
  assert.deepEqual(dto.interventionsQueue, [])
})

// ──────────────────────────────────────────────
// 8. End-to-end runtime integration
// ──────────────────────────────────────────────

test('end-to-end: runtime produces a complete PortfolioExecutiveDashboardDTO', () => {
  const input = {
    executiveDashboardReport: {
      ...baseReport(52),
      topRisks: [
        { id: 'r1', title: 'Critical resource contention', riskLevel: 'critical', source: 'conflict', affectedProjects: ['apollo'], rationale: 'Over-allocated.' },
        { id: 'r2', title: 'Timeline collision', riskLevel: 'high', source: 'conflict', affectedProjects: ['atlas'], rationale: 'Overlap.' },
      ],
      executiveSummary: 'Portfolio is critical.',
      portfolioRecommendation: 'Immediate escalation required.',
    },
    interventionReport: {
      interventions: [
        { id: 'i1', title: 'Emergency reallocation', urgency: 'critical', ownerLane: 'pmo_director', recommendedCadence: 'Immediate', affectedProjects: ['apollo'] },
        { id: 'i2', title: 'Timeline rebaseline', urgency: 'high', ownerLane: 'executive_sponsor', recommendedCadence: '72 hours', affectedProjects: ['atlas'] },
      ],
    },
    decisionSimulationReports: [
      { decisionId: 'd1', recommendation: 'approve', confidenceScore: 88, executiveSummary: 'Approve reallocation.', decisionType: 'resource_reallocation' },
      { decisionId: 'd2', recommendation: 'escalate', confidenceScore: 65, executiveSummary: 'Escalate rebaseline.', decisionType: 'timeline_delay', recommendationRationale: 'Board approval required.' },
    ],
    conflictReport: {
      conflicts: [
        { id: 'c1', type: 'resource_contention', severity: 'critical', description: 'Platform over-allocated.' },
      ],
    },
  }

  const result = runDashboardRuntimeIntegration(input)

  assert.equal(result.portfolioHealthPanel.score, 52)
  assert.equal(result.portfolioHealthPanel.status, 'critical')
  assert.equal(result.executiveSummaryCard.title, 'Portfolio Executive Summary')
  assert.equal(result.executiveSummaryCard.status, 'critical')
  assert.equal(result.topRisksTable.length, 2)
  assert.equal(result.topRisksTable[0].severity, 'critical')
  assert.equal(result.decisionsWidget.length, 2)
  assert.equal(result.interventionsQueue.length, 2)
  assert.equal(result.interventionsQueue[0].urgency, 'critical')
  assert.ok(result.alertPanel.length >= 3)
})

test('end-to-end: runtime with minimal input returns valid DTO', () => {
  const result = runDashboardRuntimeIntegration({ executiveDashboardReport: baseReport(82) })
  assert.equal(result.portfolioHealthPanel.status, 'healthy')
  assert.equal(result.executiveSummaryCard.status, 'healthy')
  assert.deepEqual(result.decisionsWidget, [])
  assert.deepEqual(result.interventionsQueue, [])
  assert.deepEqual(result.alertPanel, [])
})

test('end-to-end: deterministic — same input produces identical output', () => {
  const input = { executiveDashboardReport: baseReport(70) }
  const result1 = runDashboardRuntimeIntegration(input)
  const result2 = runDashboardRuntimeIntegration(input)
  assert.deepEqual(result1, result2)
})

import { adaptPortfolioHealthPanel } from '../src/lib/dashboard/runtime-integration/portfolio-health-adapter.ts'
import { adaptExecutiveSummaryCard } from '../src/lib/dashboard/runtime-integration/executive-summary-adapter.ts'
import { adaptRiskTable } from '../src/lib/dashboard/runtime-integration/risk-table-adapter.ts'
import { adaptDecisionWidget } from '../src/lib/dashboard/runtime-integration/decision-widget-adapter.ts'
import { adaptInterventionQueue } from '../src/lib/dashboard/runtime-integration/intervention-queue-adapter.ts'
import { adaptAlertPanel } from '../src/lib/dashboard/runtime-integration/alert-panel-adapter.ts'
import { buildPortfolioExecutiveDashboardDTO } from '../src/lib/dashboard/runtime-integration/dashboard-dto-builder.ts'
import { runDashboardRuntimeIntegration } from '../src/lib/dashboard/runtime-integration/dashboard-runtime-integration.ts'

const executiveDashboardReport = {
  generatedAt: new Date().toISOString(),
  healthSummary: {
    portfolioHealthScore: 52,
    averageProjectHealthScore: 58,
    activeProjectCount: 5,
    criticalProjectCount: 2,
    riskLevel: 'high',
    summary: 'Portfolio is under severe delivery pressure across three active tracks.',
  },
  conflictSummary: {
    conflictsDetected: 3,
    criticalConflicts: 1,
    topConflictTypes: ['resource_contention', 'timeline_collision'],
    executiveEscalationsRequired: 2,
    summary: 'Critical resource contention detected between Apollo and Beacon.',
  },
  loadSummary: {
    currentBalancingScore: 41,
    operationalRiskLevel: 'high',
    projectedImprovement: 18,
    recommendedPlanTitle: 'Platform Load Redistribution Plan',
    topBalancingActions: ['Reassign platform engineers', 'Shift beacon delivery window'],
    summary: 'Load imbalance is creating compounding operational risk.',
  },
  decisionSummary: {
    totalDecisionsSimulated: 2,
    approvalsRecommended: 1,
    escalationsRecommended: 1,
    rejectionsRecommended: 0,
    averageConfidenceScore: 77.5,
    topDecisionItems: ['Approve platform reallocation', 'Escalate atlas rebaseline'],
    summary: 'One decision ready for approval; one escalation required.',
  },
  interventionSummary: {
    totalInterventions: 4,
    criticalInterventions: 2,
    escalationCount: 3,
    topInterventionTypes: ['resource_reallocation', 'delivery_rebaseline'],
    topOwnerLanes: ['portfolio_board', 'pmo_executive'],
    summary: 'Two critical interventions require immediate portfolio board attention.',
  },
  topRisks: [
    {
      id: 'risk-001',
      title: 'Critical resource contention between Apollo and Beacon',
      riskLevel: 'critical',
      source: 'conflict',
      affectedProjects: ['apollo', 'beacon'],
      rationale: 'Platform team over-allocated across two delivery-critical tracks.',
    },
    {
      id: 'risk-002',
      title: 'Atlas delivery timeline collision with Beacon',
      riskLevel: 'high',
      source: 'conflict',
      affectedProjects: ['atlas', 'beacon'],
      rationale: 'Overlapping delivery windows create unresolvable dependency conflict.',
    },
    {
      id: 'risk-003',
      title: 'Portfolio load imbalance at operational risk threshold',
      riskLevel: 'high',
      source: 'load',
      affectedProjects: ['apollo', 'nexus'],
      rationale: 'Balancing score of 41 indicates high operational risk.',
    },
  ],
  topDecisionsNeeded: ['Approve platform reallocation', 'Escalate atlas rebaseline decision'],
  executiveAttentionAreas: ['portfolio_health', 'delivery_conflict', 'resource_capacity'],
  portfolioRecommendation:
    'Immediate executive intervention required. Prioritise resource arbitration and atlas rebaseline decision.',
  executiveSummary:
    'Portfolio health is at 52 — critical. Two interventions require board escalation. Platform reallocation approved pending executive sign-off.',
}

const interventionReport = {
  totalInterventions: 4,
  criticalInterventions: 2,
  escalationCount: 3,
  recommendedPlan: {
    id: 'plan-001',
    title: 'Emergency Portfolio Stabilisation Plan',
    interventions: [],
    portfolioHealthScore: 52,
    expectedPortfolioImpact: 'Increase portfolio health to 68 within 4 weeks.',
    executiveSummary: 'Four interventions required to stabilise portfolio.',
  },
  interventions: [
    {
      id: 'int-001',
      type: 'resource_reassignment',
      title: 'Emergency platform resource reallocation',
      description: 'Reallocate platform engineers from Nexus to Apollo.',
      affectedProjects: ['apollo', 'beacon'],
      urgency: 'critical',
      ownerLane: 'pmo_director',
      requiredEvidence: ['capacity-report', 'project-health-snapshot'],
      recommendedCadence: 'Immediate — within 48 hours',
      escalationRequired: true,
      status: 'proposed',
      rationale: 'Platform team exhaustion threatens apollo delivery date.',
    },
    {
      id: 'int-002',
      type: 'delivery_rebaseline',
      title: 'Atlas delivery rebaseline',
      description: 'Rebaseline atlas delivery to Q3 to resolve timeline collision.',
      affectedProjects: ['atlas'],
      urgency: 'critical',
      ownerLane: 'executive_sponsor',
      requiredEvidence: ['timeline-analysis', 'stakeholder-sign-off'],
      recommendedCadence: 'Within 72 hours',
      escalationRequired: true,
      status: 'proposed',
      rationale: 'Timeline conflict with beacon cannot be resolved without rebaseline.',
    },
    {
      id: 'int-003',
      type: 'stakeholder_alignment',
      title: 'Nexus stakeholder alignment session',
      description: 'Align stakeholders on budget drift mitigation approach.',
      affectedProjects: ['nexus'],
      urgency: 'high',
      ownerLane: 'project_manager',
      requiredEvidence: ['budget-report'],
      recommendedCadence: 'Weekly for 4 weeks',
      escalationRequired: true,
      status: 'proposed',
      rationale: 'Budget drift requires stakeholder approval before proceeding.',
    },
    {
      id: 'int-004',
      type: 'dependency_unblock',
      title: 'Unblock atlas-beacon dependency chain',
      description: 'Resolve technical dependency blocker between atlas and beacon.',
      affectedProjects: ['atlas', 'beacon'],
      urgency: 'medium',
      ownerLane: 'technical_lead',
      requiredEvidence: ['dependency-map'],
      recommendedCadence: 'Daily standups for 2 weeks',
      escalationRequired: false,
      status: 'proposed',
      rationale: 'Dependency chain blocker prevents beacon from proceeding to testing.',
    },
  ],
}

const decisionSimulationReports = [
  {
    decisionId: 'dec-001',
    decisionType: 'resource_reallocation',
    baseline: { portfolioStressScore: 72, averageHealthScore: 58 },
    projection: { portfolioStressDelta: -8, riskLevel: 'moderate', affectedProjects: ['apollo', 'nexus'] },
    tradeoffs: [],
    recommendation: 'approve',
    recommendationRationale: 'Reallocation reduces critical path risk by 22%.',
    confidenceScore: 84,
    executiveSummary: 'Approve platform reallocation to unblock apollo critical path.',
  },
  {
    decisionId: 'dec-002',
    decisionType: 'timeline_delay',
    baseline: { portfolioStressScore: 72, averageHealthScore: 58 },
    projection: { portfolioStressDelta: 12, riskLevel: 'high', affectedProjects: ['atlas', 'beacon'] },
    tradeoffs: [],
    recommendation: 'escalate',
    recommendationRationale: 'Rebaseline requires board-level approval due to contractual commitments.',
    confidenceScore: 71,
    executiveSummary: 'Escalate atlas rebaseline decision to portfolio board.',
  },
]

const conflictReport = {
  conflictsDetected: 3,
  criticalConflicts: 1,
  conflicts: [
    {
      id: 'c-001',
      type: 'resource_contention',
      severity: 'critical',
      involvedProjects: ['apollo', 'beacon'],
      description: 'Platform team over-allocated across two critical delivery tracks.',
      executiveRecommendation: 'Escalate to portfolio board for resource arbitration.',
    },
    {
      id: 'c-002',
      type: 'timeline_collision',
      severity: 'high',
      involvedProjects: ['beacon', 'atlas'],
      description: 'Overlapping delivery windows create unresolvable dependency conflict.',
    },
  ],
}

// Validate each adapter executes
const healthPanel = adaptPortfolioHealthPanel(executiveDashboardReport)
if (!healthPanel.score) throw new Error('health panel score missing')
if (healthPanel.status !== 'critical') throw new Error('expected critical status for score 52')
if (!healthPanel.trend) throw new Error('health panel trend missing')
if (!healthPanel.label) throw new Error('health panel label missing')

const summaryCard = adaptExecutiveSummaryCard(executiveDashboardReport)
if (summaryCard.title !== 'Portfolio Executive Summary') throw new Error('summary card title mismatch')
if (!summaryCard.summary) throw new Error('summary card summary missing')
if (summaryCard.status !== 'critical') throw new Error('expected critical status for score 52')
if (!summaryCard.recommendation) throw new Error('summary card recommendation missing')

const riskTable = adaptRiskTable(executiveDashboardReport)
if (riskTable.length < 1) throw new Error('risk table is empty')
if (riskTable[0].severity !== 'critical') throw new Error('top risk should be critical severity')
if (!riskTable[0].source) throw new Error('risk row source missing')

const decisionsWidget = adaptDecisionWidget(decisionSimulationReports)
if (decisionsWidget.length !== 2) throw new Error('expected 2 decision widget items')
const approveItem = decisionsWidget.find((d) => d.recommendation === 'approve')
if (!approveItem || approveItem.severity !== 'info') throw new Error('approve with high confidence should be info')
const escalateItem = decisionsWidget.find((d) => d.recommendation === 'escalate')
if (!escalateItem || escalateItem.severity !== 'critical') throw new Error('escalate should be critical')

const interventionsQueue = adaptInterventionQueue(interventionReport)
if (interventionsQueue.length < 1) throw new Error('intervention queue is empty')
if (interventionsQueue[0].urgency !== 'critical') throw new Error('queue should be sorted critical first')
if (!interventionsQueue[0].cadence) throw new Error('intervention cadence missing')

const alertPanel = adaptAlertPanel(
  executiveDashboardReport,
  interventionReport,
  decisionSimulationReports,
  conflictReport,
)
if (alertPanel.length < 1) throw new Error('alert panel is empty')
const conflictAlert = alertPanel.find((a) => a.type === 'conflict')
if (!conflictAlert) throw new Error('conflict alert missing')
const healthAlert = alertPanel.find((a) => a.type === 'health')
if (!healthAlert) throw new Error('portfolio health critical alert missing')

// Validate DTO builder
const dto = buildPortfolioExecutiveDashboardDTO({
  executiveDashboardReport,
  interventionReport,
  decisionSimulationReports,
  conflictReport,
})
if (!dto.portfolioHealthPanel) throw new Error('DTO missing portfolioHealthPanel')
if (!dto.executiveSummaryCard) throw new Error('DTO missing executiveSummaryCard')
if (!dto.topRisksTable) throw new Error('DTO missing topRisksTable')
if (!dto.decisionsWidget) throw new Error('DTO missing decisionsWidget')
if (!dto.interventionsQueue) throw new Error('DTO missing interventionsQueue')
if (!dto.alertPanel) throw new Error('DTO missing alertPanel')

// Validate runtime orchestration
const result = runDashboardRuntimeIntegration({
  executiveDashboardReport,
  interventionReport,
  decisionSimulationReports,
  conflictReport,
})
if (!result.portfolioHealthPanel) throw new Error('runtime result missing portfolioHealthPanel')
if (!result.executiveSummaryCard) throw new Error('runtime result missing executiveSummaryCard')
if (result.topRisksTable.length < 1) throw new Error('runtime result topRisksTable is empty')
if (result.decisionsWidget.length < 1) throw new Error('runtime result decisionsWidget is empty')
if (result.interventionsQueue.length < 1) throw new Error('runtime result interventionsQueue is empty')
if (result.alertPanel.length < 1) throw new Error('runtime result alertPanel is empty')

console.log('[ok] dashboard runtime integration valid')

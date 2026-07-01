import { generatePortfolioHealthSummary } from '../src/lib/portfolio/executive-dashboard-aggregation/health-summary-engine.ts'
import { generatePortfolioConflictSummary } from '../src/lib/portfolio/executive-dashboard-aggregation/conflict-summary-engine.ts'
import { generatePortfolioLoadSummary } from '../src/lib/portfolio/executive-dashboard-aggregation/load-summary-engine.ts'
import { generatePortfolioDecisionSummary } from '../src/lib/portfolio/executive-dashboard-aggregation/decision-summary-engine.ts'
import { generatePortfolioInterventionSummary } from '../src/lib/portfolio/executive-dashboard-aggregation/intervention-summary-engine.ts'
import { generateTopPortfolioRisks } from '../src/lib/portfolio/executive-dashboard-aggregation/risk-priority-engine.ts'
import { generatePortfolioExecutiveRecommendation } from '../src/lib/portfolio/executive-dashboard-aggregation/executive-recommendation-engine.ts'
import { runExecutiveDashboardAggregation } from '../src/lib/portfolio/executive-dashboard-aggregation/executive-dashboard-aggregation-runtime.ts'

const input = {
  portfolio: {
    portfolioHealthScore: 52,
    activeProjectCount: 5,
    criticalProjectCount: 2,
    averageProjectHealthScore: 58,
  },
  conflictReport: {
    conflictsDetected: 3,
    criticalConflicts: 1,
    portfolioHealthScore: 55,
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
        executiveRecommendation: 'Rebaseline atlas delivery to Q3.',
      },
      {
        id: 'c-003',
        type: 'budget_pressure',
        severity: 'moderate',
        involvedProjects: ['nexus'],
        description: 'Nexus budget has drifted 18% above plan.',
      },
    ],
  },
  loadBalancingReport: {
    currentBalancingScore: 41,
    projectedImprovement: 18,
    operationalRiskLevel: 'high',
    recommendedPlan: {
      id: 'plan-rebalance-001',
      title: 'Platform Load Redistribution Plan',
      projectedPortfolioHealthScore: 67,
      rationale: 'Redistribute platform team allocation and defer non-critical tasks.',
      actions: [
        {
          id: 'action-resource-reassignment',
          type: 'resource_reassignment',
          title: 'Reassign platform engineers from nexus to apollo',
          targetProjects: ['apollo', 'nexus'],
          projectedHealthGain: 10,
        },
        {
          id: 'action-timeline-shift',
          type: 'timeline_shift',
          title: 'Shift beacon delivery window by 2 weeks',
          targetProjects: ['beacon'],
          projectedHealthGain: 8,
        },
      ],
    },
  },
  decisionSimulationReports: [
    {
      decisionId: 'dec-001',
      decisionType: 'resource_reallocation',
      recommendation: 'approve',
      recommendationRationale: 'Reallocation reduces critical path risk by 22%.',
      confidenceScore: 84,
      executiveSummary: 'Approve platform reallocation to unblock apollo critical path.',
      projection: {
        portfolioStressDelta: -8,
        riskLevel: 'moderate',
        affectedProjects: ['apollo', 'nexus'],
      },
    },
    {
      decisionId: 'dec-002',
      decisionType: 'delivery_rebaseline',
      recommendation: 'escalate',
      recommendationRationale: 'Rebaseline requires board-level approval due to contractual commitments.',
      confidenceScore: 71,
      executiveSummary: 'Escalate atlas rebaseline decision to portfolio board.',
      projection: {
        portfolioStressDelta: 12,
        riskLevel: 'high',
        affectedProjects: ['atlas', 'beacon'],
      },
    },
  ],
  interventionReport: {
    totalInterventions: 4,
    criticalInterventions: 2,
    escalationCount: 3,
    interventions: [
      {
        id: 'int-001',
        type: 'resource_reallocation',
        title: 'Emergency platform resource reallocation',
        affectedProjects: ['apollo', 'beacon'],
        urgency: 'critical',
        ownerLane: 'portfolio_board',
        escalationRequired: true,
        rationale: 'Platform team exhaustion threatens apollo delivery date.',
      },
      {
        id: 'int-002',
        type: 'delivery_rebaseline',
        title: 'Atlas delivery rebaseline',
        affectedProjects: ['atlas'],
        urgency: 'critical',
        ownerLane: 'pmo_executive',
        escalationRequired: true,
        rationale: 'Timeline conflict with beacon cannot be resolved without rebaseline.',
      },
      {
        id: 'int-003',
        type: 'stakeholder_alignment',
        title: 'Nexus stakeholder alignment session',
        affectedProjects: ['nexus'],
        urgency: 'high',
        ownerLane: 'pmo_lead',
        escalationRequired: true,
        rationale: 'Budget drift requires stakeholder approval before proceeding.',
      },
      {
        id: 'int-004',
        type: 'dependency_unblock',
        title: 'Unblock atlas-beacon dependency chain',
        affectedProjects: ['atlas', 'beacon'],
        urgency: 'high',
        ownerLane: 'engineering_lead',
        escalationRequired: false,
        rationale: 'Dependency chain blocker prevents beacon from proceeding to testing.',
      },
    ],
  },
}

const healthSummary = generatePortfolioHealthSummary(input)
if (!healthSummary.riskLevel) throw new Error('health summary failed')
if (healthSummary.portfolioHealthScore !== 52) throw new Error('health score mismatch')
if (healthSummary.riskLevel !== 'high') throw new Error('expected high risk level for score 52')

const conflictSummary = generatePortfolioConflictSummary(input)
if (conflictSummary.conflictsDetected !== 3) throw new Error('conflict count mismatch')
if (conflictSummary.criticalConflicts !== 1) throw new Error('critical conflict count mismatch')
if (conflictSummary.executiveEscalationsRequired < 2) throw new Error('escalation count too low')

const loadSummary = generatePortfolioLoadSummary(input)
if (loadSummary.currentBalancingScore !== 41) throw new Error('balancing score mismatch')
if (loadSummary.operationalRiskLevel !== 'high') throw new Error('operational risk level mismatch')
if (loadSummary.topBalancingActions.length < 1) throw new Error('balancing actions missing')

const decisionSummary = generatePortfolioDecisionSummary(input)
if (decisionSummary.totalDecisionsSimulated !== 2) throw new Error('decision count mismatch')
if (decisionSummary.approvalsRecommended !== 1) throw new Error('approval count mismatch')
if (decisionSummary.escalationsRecommended !== 1) throw new Error('escalation count mismatch')

const interventionSummary = generatePortfolioInterventionSummary(input)
if (interventionSummary.totalInterventions !== 4) throw new Error('intervention count mismatch')
if (interventionSummary.criticalInterventions !== 2) throw new Error('critical intervention count mismatch')
if (interventionSummary.topInterventionTypes.length < 1) throw new Error('intervention types missing')

const topRisks = generateTopPortfolioRisks(input)
if (topRisks.length < 3) throw new Error('insufficient top risks generated')
if (topRisks[0].riskLevel !== 'critical') throw new Error('top risk should be critical')

const recommendation = generatePortfolioExecutiveRecommendation(
  input,
  healthSummary,
  conflictSummary,
  loadSummary,
  decisionSummary,
  interventionSummary,
  topRisks,
)
if (!recommendation.portfolioRecommendation) throw new Error('portfolio recommendation missing')
if (recommendation.executiveAttentionAreas.length < 1) throw new Error('attention areas missing')
if (recommendation.topDecisionsNeeded.length < 1) throw new Error('decisions needed missing')

const report = runExecutiveDashboardAggregation(input)
if (!report.generatedAt) throw new Error('generatedAt missing')
if (!report.healthSummary) throw new Error('health summary missing from report')
if (!report.conflictSummary) throw new Error('conflict summary missing from report')
if (!report.loadSummary) throw new Error('load summary missing from report')
if (!report.decisionSummary) throw new Error('decision summary missing from report')
if (!report.interventionSummary) throw new Error('intervention summary missing from report')
if (report.topRisks.length < 3) throw new Error('top risks insufficient in report')
if (!report.portfolioRecommendation) throw new Error('portfolio recommendation missing from report')
if (!report.executiveSummary) throw new Error('executive summary missing from report')

console.log('[ok] executive dashboard aggregation runtime valid')

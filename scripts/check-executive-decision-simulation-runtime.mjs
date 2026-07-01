import { calculatePortfolioBaseline } from '../src/lib/portfolio/executive-decision-simulation/decision-impact-analyzer.ts'
import { simulateExecutiveDecision } from '../src/lib/portfolio/executive-decision-simulation/decision-simulation-engine.ts'
import { generateDecisionTradeoffs } from '../src/lib/portfolio/executive-decision-simulation/tradeoff-engine.ts'
import { generateDecisionRecommendation } from '../src/lib/portfolio/executive-decision-simulation/recommendation-engine.ts'
import { calculateDecisionConfidence } from '../src/lib/portfolio/executive-decision-simulation/decision-confidence-engine.ts'
import { runExecutiveDecisionSimulation } from '../src/lib/portfolio/executive-decision-simulation/executive-decision-simulation-runtime.ts'

const input = {
  portfolio: {
    projects: [
      {
        projectId: 'platform-revamp',
        projectName: 'Platform Revamp',
        priority: 1,
        healthScore: 62,
        resourceLoad: 78,
        timelinePressure: 72,
        budgetExposure: 55,
        stakeholderLoad: 60,
        dependencyRisk: 45,
        escalationLoad: 30,
      },
      {
        projectId: 'billing-migration',
        projectName: 'Billing Migration',
        priority: 3,
        healthScore: 75,
        resourceLoad: 50,
        timelinePressure: 40,
        budgetExposure: 35,
        stakeholderLoad: 40,
        dependencyRisk: 30,
        escalationLoad: 20,
      },
      {
        projectId: 'compliance-controls',
        projectName: 'Compliance Controls',
        priority: 2,
        healthScore: 58,
        resourceLoad: 85,
        timelinePressure: 80,
        budgetExposure: 65,
        stakeholderLoad: 70,
        dependencyRisk: 60,
        escalationLoad: 45,
      },
    ],
  },
  decision: {
    id: 'dec-001',
    type: 'resource_reallocation',
    title: 'Move senior engineer from Billing Migration to Platform Revamp',
    description: 'Reallocate one senior engineer from billing-migration to platform-revamp to unblock the critical path dependency.',
    affectedProjects: ['platform-revamp', 'billing-migration'],
    sourceProjectId: 'billing-migration',
    targetProjectId: 'platform-revamp',
    resourceDelta: 20,
  },
}

// Baseline calculation
const baseline = calculatePortfolioBaseline(input.portfolio)
if (typeof baseline.averageHealthScore !== 'number') throw new Error('baseline averageHealthScore must be a number')
if (typeof baseline.portfolioStressScore !== 'number') throw new Error('baseline portfolioStressScore must be a number')
if (baseline.portfolioStressScore < 0 || baseline.portfolioStressScore > 100) throw new Error('portfolioStressScore out of range')

// Simulation executes
const projection = simulateExecutiveDecision(input)
if (!projection.affectedProjects || projection.affectedProjects.length === 0) throw new Error('projection must include affected projects')
if (typeof projection.healthDelta !== 'number') throw new Error('projection healthDelta must be a number')
if (typeof projection.portfolioStressDelta !== 'number') throw new Error('projection portfolioStressDelta must be a number')

// Projection returns valid deltas
if (!['low', 'moderate', 'high', 'critical'].includes(projection.riskLevel)) {
  throw new Error(`invalid riskLevel: ${projection.riskLevel}`)
}

// Tradeoffs generated
const tradeoffs = generateDecisionTradeoffs(input, projection)
if (tradeoffs.length < 2) throw new Error('must generate at least 2 tradeoffs')
for (const t of tradeoffs) {
  if (!t.id || !t.title || !t.positiveImpact || !t.negativeImpact) {
    throw new Error('tradeoff missing required fields')
  }
}

// Recommendation generated
const { recommendation, rationale } = generateDecisionRecommendation(input, baseline, projection, tradeoffs)
if (!['approve', 'approve_with_conditions', 'defer', 'reject', 'escalate'].includes(recommendation)) {
  throw new Error(`invalid recommendation: ${recommendation}`)
}
if (!rationale || rationale.length === 0) throw new Error('rationale must not be empty')

// Confidence score bounded 0-100
const confidence = calculateDecisionConfidence(input, baseline, projection, tradeoffs)
if (confidence < 0 || confidence > 100) throw new Error(`confidence score out of range: ${confidence}`)

// Runtime orchestration succeeds end-to-end
const report = runExecutiveDecisionSimulation(input)
if (!report || report.decisionId !== input.decision.id) throw new Error('runtime orchestration failed: decisionId mismatch')
if (report.decisionType !== input.decision.type) throw new Error('runtime orchestration failed: decisionType mismatch')
if (!report.executiveSummary || report.executiveSummary.length === 0) throw new Error('executiveSummary must not be empty')
if (report.confidenceScore < 0 || report.confidenceScore > 100) throw new Error('report confidenceScore out of range')
if (!report.tradeoffs || report.tradeoffs.length < 2) throw new Error('report must include tradeoffs')

console.log('[ok] executive decision simulation runtime valid')

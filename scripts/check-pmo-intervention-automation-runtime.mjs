import { detectPMOInterventions } from '../src/lib/portfolio/pmo-intervention-automation/intervention-detector.ts'
import { assignInterventionUrgency } from '../src/lib/portfolio/pmo-intervention-automation/priority-engine.ts'
import { assignInterventionOwnerLane } from '../src/lib/portfolio/pmo-intervention-automation/ownership-engine.ts'
import { generateRequiredEvidence } from '../src/lib/portfolio/pmo-intervention-automation/evidence-engine.ts'
import { generateRecommendedCadence } from '../src/lib/portfolio/pmo-intervention-automation/cadence-engine.ts'
import { generatePMOInterventionPlan } from '../src/lib/portfolio/pmo-intervention-automation/automation-plan-engine.ts'
import { runPMOInterventionAutomation } from '../src/lib/portfolio/pmo-intervention-automation/pmo-intervention-automation-runtime.ts'

const input = {
  portfolioContext: {
    portfolioHealthScore: 52,
    activeProjects: [
      {
        projectId: 'proj-alpha',
        projectName: 'Alpha Platform',
        priority: 1,
        healthScore: 33,
        status: 'blocked',
        blockers: ['Invoice payment delayed - PO not approved by finance'],
        risks: [],
        missingInputs: [],
        pendingDependencies: [],
        financialExposure: 250000,
        resourcePressure: 82,
        timelinePressure: 88,
        stakeholderPressure: 65,
        vendorDependency: false,
        clientDependency: false,
        executiveVisibility: true,
      },
      {
        projectId: 'proj-beta',
        projectName: 'Beta Integration',
        priority: 3,
        healthScore: 61,
        status: 'in_progress',
        blockers: [],
        risks: ['scope ambiguity in integration layer'],
        missingInputs: ['client API credentials', 'client sign-off on technical spec'],
        pendingDependencies: ['auth-service-v2'],
        financialExposure: 80000,
        resourcePressure: 52,
        timelinePressure: 58,
        stakeholderPressure: 72,
        vendorDependency: true,
        clientDependency: true,
        executiveVisibility: false,
      },
      {
        projectId: 'proj-gamma',
        projectName: 'Gamma Logistics',
        priority: 5,
        healthScore: 74,
        status: 'in_progress',
        blockers: ['logistics vendor ETA not confirmed for equipment shipment'],
        risks: [],
        missingInputs: [],
        pendingDependencies: [],
        financialExposure: 42000,
        resourcePressure: 40,
        timelinePressure: 62,
        stakeholderPressure: 38,
        vendorDependency: false,
        clientDependency: false,
        executiveVisibility: false,
      },
    ],
  },
  conflictSignals: [
    {
      conflictId: 'conflict-001',
      type: 'resource_contention',
      severity: 'high',
      involvedProjects: ['proj-alpha', 'proj-beta'],
      executiveRecommendation: 'Reassign shared capacity to highest-priority project',
    },
  ],
  decisionSimulationSignals: [
    {
      decisionId: 'decision-001',
      recommendation: 'approve_with_conditions',
      confidenceScore: 69,
      riskLevel: 'moderate',
      portfolioStressDelta: 9,
    },
  ],
}

// 1. Detection
const candidates = detectPMOInterventions(input)
if (candidates.length === 0) throw new Error('detection failed: no candidates produced')
if (!candidates.some((c) => c.type === 'financial_impediment')) throw new Error('detection failed: missing financial_impediment')
if (!candidates.some((c) => c.type === 'client_input_request')) throw new Error('detection failed: missing client_input_request')
if (!candidates.some((c) => c.type === 'vendor_logistics_followup')) throw new Error('detection failed: missing vendor_logistics_followup')
if (!candidates.some((c) => c.type === 'executive_arbitration')) throw new Error('detection failed: missing executive_arbitration from conflict signal')
if (!candidates.some((c) => c.type === 'risk_control_review')) throw new Error('detection failed: missing risk_control_review from decision signal')

// 2. Urgency assignment
const urgencyValues = ['low', 'medium', 'high', 'critical']
for (const candidate of candidates) {
  const urgency = assignInterventionUrgency(candidate, input)
  if (!urgencyValues.includes(urgency)) throw new Error(`urgency assignment failed: invalid value "${urgency}" for ${candidate.type}`)
}

// 3. Owner lane assignment
const laneValues = ['project_manager', 'pmo_director', 'technical_lead', 'finance_lead', 'logistics_lead', 'executive_sponsor', 'client_owner', 'vendor_owner']
for (const candidate of candidates) {
  const lane = assignInterventionOwnerLane(candidate)
  if (!laneValues.includes(lane)) throw new Error(`owner lane assignment failed: invalid lane "${lane}" for ${candidate.type}`)
}

// 4. Evidence generation
for (const candidate of candidates) {
  const evidence = generateRequiredEvidence(candidate)
  if (!Array.isArray(evidence) || evidence.length === 0) throw new Error(`evidence generation failed: empty evidence for ${candidate.type}`)
}

// 5. Cadence generation
for (const candidate of candidates) {
  const cadence = generateRecommendedCadence(candidate)
  if (!cadence || cadence.length === 0) throw new Error(`cadence generation failed: empty cadence for ${candidate.type}`)
}

// 6. Plan generation
const plan = generatePMOInterventionPlan(candidates, input)
if (!plan.id || plan.id !== 'pmo-intervention-plan') throw new Error('plan generation failed: wrong plan id')
if (!plan.interventions || plan.interventions.length === 0) throw new Error('plan generation failed: no interventions')
if (!plan.executiveSummary || !plan.executiveSummary.includes('PMFreak detected')) throw new Error('plan generation failed: bad executive summary')

// 7. Runtime orchestration
const report = runPMOInterventionAutomation(input)
if (!report.interventions || report.interventions.length === 0) throw new Error('runtime orchestration failed: no interventions')
if (!report.recommendedPlan) throw new Error('runtime orchestration failed: no recommended plan')
if (report.totalInterventions !== report.interventions.length) throw new Error('runtime orchestration failed: count mismatch')
if (report.criticalInterventions < 0) throw new Error('runtime orchestration failed: negative critical count')
for (const intervention of report.interventions) {
  if (!intervention.requiredEvidence.length) throw new Error(`runtime orchestration failed: ${intervention.type} has no evidence`)
  if (!intervention.recommendedCadence.length) throw new Error(`runtime orchestration failed: ${intervention.type} has no cadence`)
}

console.log('[ok] pmo intervention automation runtime valid')

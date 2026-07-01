import test from 'node:test'
import assert from 'node:assert/strict'

import { detectPMOInterventions } from '../src/lib/portfolio/pmo-intervention-automation/intervention-detector.ts'
import { assignInterventionUrgency } from '../src/lib/portfolio/pmo-intervention-automation/priority-engine.ts'
import { assignInterventionOwnerLane } from '../src/lib/portfolio/pmo-intervention-automation/ownership-engine.ts'
import { generateRequiredEvidence } from '../src/lib/portfolio/pmo-intervention-automation/evidence-engine.ts'
import { generateRecommendedCadence } from '../src/lib/portfolio/pmo-intervention-automation/cadence-engine.ts'
import { generatePMOInterventionPlan } from '../src/lib/portfolio/pmo-intervention-automation/automation-plan-engine.ts'
import { runPMOInterventionAutomation } from '../src/lib/portfolio/pmo-intervention-automation/pmo-intervention-automation-runtime.ts'

const input = {
  portfolioContext: {
    portfolioHealthScore: 55,
    activeProjects: [
      {
        projectId: 'proj-alpha',
        projectName: 'Alpha Platform',
        priority: 1,
        healthScore: 35,
        status: 'blocked',
        blockers: ['Invoice payment delayed - PO not approved by finance'],
        risks: [],
        missingInputs: [],
        pendingDependencies: [],
        financialExposure: 250000,
        resourcePressure: 80,
        timelinePressure: 85,
        stakeholderPressure: 60,
        vendorDependency: false,
        clientDependency: false,
        executiveVisibility: true,
      },
      {
        projectId: 'proj-beta',
        projectName: 'Beta Integration',
        priority: 3,
        healthScore: 62,
        status: 'in_progress',
        blockers: [],
        risks: ['scope ambiguity in integration layer'],
        missingInputs: ['client API credentials', 'client approval on spec'],
        pendingDependencies: ['vendor-auth-service'],
        financialExposure: 80000,
        resourcePressure: 50,
        timelinePressure: 55,
        stakeholderPressure: 70,
        vendorDependency: true,
        clientDependency: true,
        executiveVisibility: false,
      },
      {
        projectId: 'proj-gamma',
        projectName: 'Gamma Logistics',
        priority: 5,
        healthScore: 70,
        status: 'in_progress',
        blockers: ['logistics vendor ETA not confirmed for hardware delivery'],
        risks: [],
        missingInputs: [],
        pendingDependencies: [],
        financialExposure: 40000,
        resourcePressure: 45,
        timelinePressure: 60,
        stakeholderPressure: 40,
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
      executiveRecommendation: 'Reassign shared resources to highest-priority project',
    },
  ],
  decisionSimulationSignals: [
    {
      decisionId: 'decision-001',
      recommendation: 'approve_with_conditions',
      confidenceScore: 72,
      riskLevel: 'moderate',
      portfolioStressDelta: 8,
    },
  ],
}

test('detects financial impediment from blocker text', () => {
  const candidates = detectPMOInterventions(input)
  assert.ok(candidates.some((c) => c.type === 'financial_impediment' && c.affectedProjects.includes('proj-alpha')))
})

test('detects client input request from missing inputs', () => {
  const candidates = detectPMOInterventions(input)
  assert.ok(candidates.some((c) => c.type === 'client_input_request' && c.affectedProjects.includes('proj-beta')))
})

test('detects scope freeze or technical validation from scope risk', () => {
  const candidates = detectPMOInterventions(input)
  assert.ok(candidates.some((c) =>
    (c.type === 'scope_freeze' || c.type === 'technical_validation_session') &&
    c.affectedProjects.includes('proj-beta')
  ))
})

test('detects dependency unblock from pending dependencies', () => {
  const candidates = detectPMOInterventions(input)
  assert.ok(candidates.some((c) => c.type === 'dependency_unblock' && c.affectedProjects.includes('proj-beta')))
})

test('detects vendor logistics followup from blocker text', () => {
  const candidates = detectPMOInterventions(input)
  assert.ok(candidates.some((c) => c.type === 'vendor_logistics_followup' && c.affectedProjects.includes('proj-gamma')))
})

test('detects vendor logistics followup from vendorDependency flag', () => {
  const candidates = detectPMOInterventions(input)
  assert.ok(candidates.some((c) => c.type === 'vendor_logistics_followup' && c.affectedProjects.includes('proj-beta')))
})

test('detects resource reassignment from resource pressure threshold', () => {
  const candidates = detectPMOInterventions(input)
  assert.ok(candidates.some((c) => c.type === 'resource_reassignment' && c.affectedProjects.includes('proj-alpha')))
})

test('detects executive arbitration from high-severity conflict signal', () => {
  const candidates = detectPMOInterventions(input)
  assert.ok(candidates.some((c) =>
    c.type === 'executive_arbitration' &&
    c.affectedProjects.includes('proj-alpha') &&
    c.affectedProjects.includes('proj-beta')
  ))
})

test('detects risk control review from approve_with_conditions decision signal', () => {
  const candidates = detectPMOInterventions(input)
  assert.ok(candidates.some((c) => c.type === 'risk_control_review'))
})

test('detects delivery rebaseline from timeline pressure threshold', () => {
  const candidates = detectPMOInterventions(input)
  assert.ok(candidates.some((c) => c.type === 'delivery_rebaseline' && c.affectedProjects.includes('proj-alpha')))
})

test('assigns critical urgency for health below 40', () => {
  const candidates = detectPMOInterventions(input)
  const candidate = candidates.find((c) => c.affectedProjects.includes('proj-alpha') && c.type === 'financial_impediment')
  assert.ok(candidate)
  const urgency = assignInterventionUrgency(candidate, input)
  assert.equal(urgency, 'critical')
})

test('assigns high urgency for high-severity conflict involvement', () => {
  const candidates = detectPMOInterventions(input)
  const candidate = candidates.find((c) => c.type === 'client_input_request' && c.affectedProjects.includes('proj-beta'))
  assert.ok(candidate)
  const urgency = assignInterventionUrgency(candidate, input)
  assert.ok(urgency === 'high' || urgency === 'critical')
})

test('assigns correct owner lane for financial impediment', () => {
  const candidates = detectPMOInterventions(input)
  const candidate = candidates.find((c) => c.type === 'financial_impediment')
  assert.ok(candidate)
  const lane = assignInterventionOwnerLane(candidate)
  assert.equal(lane, 'finance_lead')
})

test('assigns correct owner lane for dependency unblock', () => {
  const candidates = detectPMOInterventions(input)
  const candidate = candidates.find((c) => c.type === 'dependency_unblock')
  assert.ok(candidate)
  const lane = assignInterventionOwnerLane(candidate)
  assert.equal(lane, 'technical_lead')
})

test('assigns correct owner lane for executive arbitration', () => {
  const candidates = detectPMOInterventions(input)
  const candidate = candidates.find((c) => c.type === 'executive_arbitration')
  assert.ok(candidate)
  const lane = assignInterventionOwnerLane(candidate)
  assert.equal(lane, 'pmo_director')
})

test('generates 4 required evidence items for financial impediment', () => {
  const candidates = detectPMOInterventions(input)
  const candidate = candidates.find((c) => c.type === 'financial_impediment')
  assert.ok(candidate)
  const evidence = generateRequiredEvidence(candidate)
  assert.equal(evidence.length, 4)
})

test('generates 4 required evidence items for executive arbitration', () => {
  const candidates = detectPMOInterventions(input)
  const candidate = candidates.find((c) => c.type === 'executive_arbitration')
  assert.ok(candidate)
  const evidence = generateRequiredEvidence(candidate)
  assert.equal(evidence.length, 4)
})

test('generates immediate review cadence for executive arbitration', () => {
  const mockCandidate = { type: 'executive_arbitration', urgency: 'critical' }
  const cadence = generateRecommendedCadence(mockCandidate)
  assert.ok(cadence.includes('Immediate'))
})

test('generates daily finance cadence for critical financial impediment', () => {
  const mockCandidate = { type: 'financial_impediment', urgency: 'critical' }
  const cadence = generateRecommendedCadence(mockCandidate)
  assert.ok(cadence.includes('Daily'))
})

test('generates 48-hour cadence for vendor logistics followup', () => {
  const mockCandidate = { type: 'vendor_logistics_followup', urgency: 'high' }
  const cadence = generateRecommendedCadence(mockCandidate)
  assert.ok(cadence.includes('48 hours'))
})

test('generates scope freeze cadence for scope freeze intervention', () => {
  const mockCandidate = { type: 'scope_freeze', urgency: 'medium' }
  const cadence = generateRecommendedCadence(mockCandidate)
  assert.ok(cadence.includes('Freeze'))
})

test('generates weekly cadence for low urgency', () => {
  const mockCandidate = { type: 'delivery_rebaseline', urgency: 'low' }
  const cadence = generateRecommendedCadence(mockCandidate)
  assert.equal(cadence, 'Weekly governance review')
})

test('plan sorts critical interventions first', () => {
  const report = runPMOInterventionAutomation(input)
  const firstUrgency = report.recommendedPlan.interventions[0]?.urgency
  assert.equal(firstUrgency, 'critical')
})

test('plan contains non-empty executive summary', () => {
  const report = runPMOInterventionAutomation(input)
  assert.ok(report.recommendedPlan.executiveSummary.length > 0)
  assert.ok(report.recommendedPlan.executiveSummary.includes('PMFreak detected'))
})

test('plan id is stable', () => {
  const candidates = detectPMOInterventions(input)
  const plan = generatePMOInterventionPlan(candidates, input)
  assert.equal(plan.id, 'pmo-intervention-plan')
  assert.equal(plan.title, 'Recommended PMO Intervention Plan')
})

test('end-to-end runtime report structure is valid', () => {
  const report = runPMOInterventionAutomation(input)
  assert.ok(report.totalInterventions > 0)
  assert.ok(report.criticalInterventions >= 0)
  assert.ok(report.escalationCount >= 0)
  assert.ok(report.interventions.length === report.totalInterventions)
  assert.ok(report.recommendedPlan.interventions.length === report.totalInterventions)
})

test('end-to-end runtime every intervention has evidence and cadence', () => {
  const report = runPMOInterventionAutomation(input)
  for (const intervention of report.interventions) {
    assert.ok(intervention.requiredEvidence.length > 0, `${intervention.type} missing evidence`)
    assert.ok(intervention.recommendedCadence.length > 0, `${intervention.type} missing cadence`)
    assert.ok(intervention.ownerLane.length > 0, `${intervention.type} missing owner lane`)
  }
})

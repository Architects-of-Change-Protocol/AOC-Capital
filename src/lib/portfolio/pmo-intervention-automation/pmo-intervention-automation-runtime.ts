import { generatePMOInterventionPlan } from './automation-plan-engine'
import { generateRecommendedCadence } from './cadence-engine'
import { generateRequiredEvidence } from './evidence-engine'
import { detectPMOInterventions } from './intervention-detector'
import { assignInterventionOwnerLane } from './ownership-engine'
import { assignInterventionUrgency } from './priority-engine'
import type { PMOInterventionAutomationReport, PMOInterventionInput } from './types'

export function runPMOInterventionAutomation(input: PMOInterventionInput): PMOInterventionAutomationReport {
  const raw = detectPMOInterventions(input)

  const interventions = raw.map((candidate) => {
    const urgency = assignInterventionUrgency(candidate, input)
    const withUrgency = { ...candidate, urgency }

    const ownerLane = assignInterventionOwnerLane(withUrgency)
    const withOwner = { ...withUrgency, ownerLane }

    const requiredEvidence = generateRequiredEvidence(withOwner)
    const recommendedCadence = generateRecommendedCadence(withOwner)
    const escalationRequired = urgency === 'critical' || urgency === 'high' || withOwner.escalationRequired

    return { ...withOwner, requiredEvidence, recommendedCadence, escalationRequired }
  })

  const recommendedPlan = generatePMOInterventionPlan(interventions, input)

  return {
    totalInterventions: interventions.length,
    criticalInterventions: interventions.filter((i) => i.urgency === 'critical').length,
    escalationCount: interventions.filter((i) => i.escalationRequired).length,
    recommendedPlan,
    interventions,
  }
}

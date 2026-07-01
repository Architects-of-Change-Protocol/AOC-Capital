import type {
  DecisionImpactProjection,
  DecisionRecommendation,
  DecisionTradeoff,
  PortfolioBaseline,
  PortfolioDecisionInput,
} from './types'

export function generateDecisionRecommendation(
  input: PortfolioDecisionInput,
  baseline: PortfolioBaseline,
  projection: DecisionImpactProjection,
  tradeoffs: DecisionTradeoff[],
): { recommendation: DecisionRecommendation; rationale: string } {
  const { healthDelta, portfolioStressDelta, riskLevel, affectedProjects } = projection
  const highRiskTradeoffs = tradeoffs.filter((t) => t.severity === 'high' || t.severity === 'critical').length
  const affectedCount = affectedProjects.length

  // Critical risk with broad multi-project impact → must involve executive sponsor
  if (riskLevel === 'critical' && affectedCount >= 3) {
    return {
      recommendation: 'escalate',
      rationale: `Decision carries critical risk spanning ${affectedCount} projects and requires executive sponsor engagement before any execution proceeds. Portfolio stress delta of ${portfolioStressDelta} exceeds safe approval threshold.`,
    }
  }

  // Critical risk on single/dual projects with material health decline → reject
  if (riskLevel === 'critical' && healthDelta < 0) {
    return {
      recommendation: 'reject',
      rationale: `Decision introduces critical risk with a health degradation of ${Math.abs(healthDelta).toFixed(1)} points and no compensating portfolio benefit. Current baseline stress of ${baseline.portfolioStressScore} leaves insufficient headroom to absorb this impact.`,
    }
  }

  // Health materially declines AND stress increases significantly → reject
  if (healthDelta < -5 && portfolioStressDelta > 8) {
    return {
      recommendation: 'reject',
      rationale: `Decision degrades portfolio health by ${Math.abs(healthDelta).toFixed(1)} points and increases portfolio stress by ${portfolioStressDelta} points without sufficient compensating benefit. Risk level: ${riskLevel}.`,
    }
  }

  // Health improves, stress reduces, low or moderate risk → straightforward approval
  if (healthDelta > 0 && portfolioStressDelta <= 0 && (riskLevel === 'low' || riskLevel === 'moderate')) {
    return {
      recommendation: 'approve',
      rationale: `Decision improves portfolio health by ${healthDelta.toFixed(1)} points and reduces overall stress by ${Math.abs(portfolioStressDelta)} points. Risk profile is ${riskLevel} with ${highRiskTradeoffs} high-impact tradeoff${highRiskTradeoffs !== 1 ? 's' : ''} requiring monitoring.`,
    }
  }

  // Health improves but risk is elevated or cost rises → approve with mitigation conditions
  if (healthDelta > 0 && (riskLevel === 'moderate' || riskLevel === 'high')) {
    return {
      recommendation: 'approve_with_conditions',
      rationale: `Decision improves portfolio health by ${healthDelta.toFixed(1)} points but introduces ${riskLevel} execution risk. Approve subject to mitigation controls for ${highRiskTradeoffs} high-impact tradeoff${highRiskTradeoffs !== 1 ? 's' : ''} and active monitoring of affected projects.`,
    }
  }

  // Stress increases but not severe, outcome is mixed or unclear → defer for sequencing
  if (portfolioStressDelta > 0 && portfolioStressDelta <= 12 && healthDelta >= -3) {
    return {
      recommendation: 'defer',
      rationale: `Decision increases portfolio stress by ${portfolioStressDelta} points with unclear net benefit at current baseline stability of ${baseline.portfolioStressScore}. Recommend deferring until portfolio baseline stabilizes or sequencing after higher-priority decisions resolve.`,
    }
  }

  // High risk, stress increases without compensating health gain → escalate for review
  if (riskLevel === 'high' && portfolioStressDelta > 5) {
    return {
      recommendation: 'escalate',
      rationale: `Decision introduces ${riskLevel} risk across ${affectedCount} project${affectedCount !== 1 ? 's' : ''} with a stress increase of ${portfolioStressDelta} points. Executive review required to validate the strategic rationale before approval.`,
    }
  }

  // Default: mixed signals, approve with conditions and monitoring
  return {
    recommendation: 'approve_with_conditions',
    rationale: `Decision has mixed portfolio impact with a health delta of ${healthDelta.toFixed(1)} points and stress delta of ${portfolioStressDelta} points. Proceed with active monitoring of ${affectedCount} affected project${affectedCount !== 1 ? 's' : ''} and validate risk mitigation controls are in place.`,
  }
}

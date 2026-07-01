import type { DecisionImpactProjection, DecisionRiskLevel, DecisionTradeoff, ExecutiveDecisionType, PortfolioDecisionInput } from './types'

interface TradeoffTemplate {
  title: string
  positiveImpact: string
  negativeImpact: string
  severity: DecisionRiskLevel
}

const TRADEOFF_TEMPLATES: Record<ExecutiveDecisionType, TradeoffTemplate[]> = {
  resource_reallocation: [
    {
      title: 'Delivery acceleration for target project vs. source capacity risk',
      positiveImpact: 'Target project gains dedicated capacity and can accelerate delivery against its committed timeline.',
      negativeImpact: 'Source project loses a critical resource, increasing its execution risk and potential for milestone slippage.',
      severity: 'moderate',
    },
    {
      title: 'Priority alignment vs. team continuity disruption',
      positiveImpact: 'Portfolio capacity is redirected to higher-value work, improving overall portfolio return on investment.',
      negativeImpact: 'Context switching and knowledge transfer reduce team throughput in the short term across both projects.',
      severity: 'moderate',
    },
    {
      title: 'Escalation relief for target vs. potential escalation exposure for source',
      positiveImpact: 'Target project unblocks its delivery path, reducing escalation pressure on executive sponsors.',
      negativeImpact: 'Source project may become the next escalation candidate if it loses its stabilizing resource.',
      severity: 'low',
    },
  ],
  timeline_delay: [
    {
      title: 'Timeline pressure relief vs. downstream dependency chain disruption',
      positiveImpact: 'Delayed project team gains breathing room to stabilize quality and reduce execution risk.',
      negativeImpact: 'Projects with dependencies on the delayed project may absorb compounding schedule pressure.',
      severity: 'high',
    },
    {
      title: 'Delivery quality improvement vs. stakeholder commitment credibility',
      positiveImpact: 'Reduced delivery velocity allows for deeper validation, improving final quality and reducing defect exposure.',
      negativeImpact: 'Stakeholders lose confidence in committed timelines, increasing governance scrutiny on all active projects.',
      severity: 'moderate',
    },
    {
      title: 'Resource load reduction vs. extended contract and budget exposure',
      positiveImpact: 'Team capacity is freed, allowing redistribution to other portfolio priorities during the delay window.',
      negativeImpact: 'Extended delivery windows increase vendor, contractor, and license cost exposure.',
      severity: 'moderate',
    },
  ],
  timeline_acceleration: [
    {
      title: 'Faster customer delivery vs. team burnout and quality risk',
      positiveImpact: 'Accelerated delivery captures earlier revenue recognition and improves customer satisfaction scores.',
      negativeImpact: 'Compressed timelines elevate defect exposure and create unsustainable resource load, risking team attrition.',
      severity: 'high',
    },
    {
      title: 'Competitive positioning gain vs. portfolio load imbalance',
      positiveImpact: 'Accelerated project creates a market advantage window that justifies short-term resource strain.',
      negativeImpact: 'Other portfolio projects absorb reduced capacity as resources concentrate on the accelerated project.',
      severity: 'high',
    },
    {
      title: 'Executive visibility benefit vs. delivery risk escalation',
      positiveImpact: 'Successful early delivery signals organizational execution capability to senior leadership.',
      negativeImpact: 'If acceleration fails to land on target, executive visibility amplifies the reputational exposure of the miss.',
      severity: 'moderate',
    },
  ],
  budget_hold: [
    {
      title: 'Short-term financial risk reduction vs. delivery timeline extension',
      positiveImpact: 'Budget hold prevents overrun exposure and improves near-term portfolio financial health reporting.',
      negativeImpact: 'Procurement and vendor commitments stall, extending delivery timelines and compressing future execution windows.',
      severity: 'high',
    },
    {
      title: 'Budget discipline vs. delivery confidence erosion',
      positiveImpact: 'Finance and executive stakeholders gain confidence that portfolio spending is under control.',
      negativeImpact: 'Project teams lose confidence in organizational support, degrading delivery predictability and morale.',
      severity: 'high',
    },
    {
      title: 'Dependency risk containment vs. chain-reaction delay amplification',
      positiveImpact: 'Hold prevents premature commitment to dependent downstream spend before the risk picture clears.',
      negativeImpact: 'Dependent projects that rely on outputs from the held project absorb compounding delays across the portfolio.',
      severity: 'critical',
    },
  ],
  budget_release: [
    {
      title: 'Delivery momentum restoration vs. higher financial exposure ceiling',
      positiveImpact: 'Released budget unblocks critical work, allowing teams to meet previously committed delivery milestones.',
      negativeImpact: 'Portfolio budget exposure increases, creating overhead for financial reporting and executive oversight.',
      severity: 'moderate',
    },
    {
      title: 'Dependency unblocking vs. cascading financial pressure',
      positiveImpact: 'Projects downstream of the funded work can proceed, reducing portfolio-wide delivery risk.',
      negativeImpact: 'Additional budget release may trigger downstream projects to request similar treatment, amplifying total exposure.',
      severity: 'moderate',
    },
  ],
  scope_reduction: [
    {
      title: 'Delivery timeline recovery vs. feature completeness gap',
      positiveImpact: 'Reduced scope narrows the delivery window, allowing the team to hit revised milestones with higher confidence.',
      negativeImpact: 'Removed features create a functional gap that may require a follow-on phase, deferring full value realization.',
      severity: 'moderate',
    },
    {
      title: 'Resource load reduction vs. stakeholder expectation risk',
      positiveImpact: 'Team capacity is freed, improving sustainability and reducing burnout risk across the project.',
      negativeImpact: 'Stakeholders who committed to the original scope may escalate dissatisfaction, increasing relationship risk.',
      severity: 'high',
    },
    {
      title: 'Sustainable delivery vs. commercial risk from reduced output',
      positiveImpact: 'A reduced but delivered product generates earlier cash flow and validates the core value proposition.',
      negativeImpact: 'If the removed scope contained critical contractual commitments, the organization faces potential SLA or contract risk.',
      severity: 'high',
    },
  ],
  scope_expansion: [
    {
      title: 'Increased feature value vs. delivery timeline extension',
      positiveImpact: 'Additional scope captures broader customer requirements and strengthens the product value proposition.',
      negativeImpact: 'Expanded scope extends the delivery timeline, increasing overall portfolio delivery risk and executive pressure.',
      severity: 'high',
    },
    {
      title: 'Competitive differentiation vs. resource strain across the portfolio',
      positiveImpact: 'Expanded capabilities create a competitive moat and reduce the need for a separate follow-on investment.',
      negativeImpact: 'Portfolio resource pool absorbs increased demand, creating contention with other active project commitments.',
      severity: 'high',
    },
    {
      title: 'Customer satisfaction upside vs. budget and capacity ceiling pressure',
      positiveImpact: 'Broader scope delivers higher perceived value and strengthens the customer relationship.',
      negativeImpact: 'Budget and capacity expansion required to execute additional scope may breach portfolio financial thresholds.',
      severity: 'moderate',
    },
  ],
  priority_override: [
    {
      title: 'Critical path focus vs. deprioritized project delivery risk',
      positiveImpact: 'Highest-priority project receives concentrated organizational focus, improving delivery confidence and speed.',
      negativeImpact: 'Deprioritized projects accumulate deferred work and stakeholder dissatisfaction that compounds over time.',
      severity: 'moderate',
    },
    {
      title: 'Portfolio fairness disruption vs. strategic value concentration',
      positiveImpact: 'Resources concentrate on the highest-return investment, maximizing portfolio-level strategic outcome.',
      negativeImpact: 'Teams on deprioritized projects lose motivation and organizational trust, increasing attrition risk.',
      severity: 'moderate',
    },
    {
      title: 'Executive sponsor visibility vs. escalation load saturation',
      positiveImpact: 'Executive sponsorship signal accelerates decision velocity and removes organizational blockers.',
      negativeImpact: 'Overriding priority creates escalation load on the same executive sponsor already managing other decisions.',
      severity: 'high',
    },
  ],
  temporary_capacity_addition: [
    {
      title: 'Delivery risk reduction vs. higher short-term financial exposure',
      positiveImpact: 'Added capacity absorbs peak delivery load, reducing timeline risk without permanent headcount commitment.',
      negativeImpact: 'Contractor or surge staffing increases short-term budget exposure and financial reporting complexity.',
      severity: 'moderate',
    },
    {
      title: 'Timeline recovery vs. integration and onboarding overhead',
      positiveImpact: 'Additional team members accelerate execution and reduce bottleneck pressure on existing critical resources.',
      negativeImpact: 'Onboarding new capacity introduces short-term velocity dip and knowledge transfer overhead.',
      severity: 'low',
    },
    {
      title: 'Reduced portfolio dependency risk vs. coordination complexity increase',
      positiveImpact: 'Capacity buffer unblocks dependent projects and reduces cascading delivery risk across the portfolio.',
      negativeImpact: 'Larger team size increases coordination overhead and introduces communication complexity at the project level.',
      severity: 'low',
    },
  ],
  executive_escalation: [
    {
      title: 'Decision acceleration vs. leadership bandwidth saturation',
      positiveImpact: 'Executive involvement resolves blocked decisions and unblocks delivery path in high-stakes scenarios.',
      negativeImpact: 'Each escalation consumes executive bandwidth; excessive escalation load degrades leadership decision quality.',
      severity: 'high',
    },
    {
      title: 'Bottleneck resolution vs. organizational dependency on escalation culture',
      positiveImpact: 'Escalation removes structural blockers that teams cannot resolve independently, restoring delivery momentum.',
      negativeImpact: 'Repeated escalation patterns signal systemic governance gaps and create organizational learned helplessness.',
      severity: 'moderate',
    },
    {
      title: 'Stakeholder alignment benefit vs. escalation signaling risk',
      positiveImpact: 'Executive visibility creates organizational alignment and removes political blockers from the delivery path.',
      negativeImpact: 'Visible escalation signals project distress to stakeholders, potentially triggering additional scrutiny or governance load.',
      severity: 'moderate',
    },
  ],
}

export function generateDecisionTradeoffs(
  input: PortfolioDecisionInput,
  projection: DecisionImpactProjection,
): DecisionTradeoff[] {
  const templates = TRADEOFF_TEMPLATES[input.decision.type]
  const affectedProjects = projection.affectedProjects

  return templates.map((template, index) => ({
    id: `tradeoff-${input.decision.type}-${index + 1}`,
    title: template.title,
    positiveImpact: template.positiveImpact,
    negativeImpact: template.negativeImpact,
    affectedProjects,
    severity: template.severity,
  }))
}

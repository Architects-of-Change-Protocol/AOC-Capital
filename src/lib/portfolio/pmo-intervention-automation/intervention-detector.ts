import type { PMOInterventionCandidate, PMOInterventionInput, PMOInterventionType, PMOOwnerLane } from './types'

const FINANCIAL_KEYWORDS = ['payment', 'invoice', 'purchase order', 'po not', 'po approved', 'po delayed', 'budget hold', 'financial hold', 'funding hold', 'billing hold']
const SCOPE_KEYWORDS = ['scope ambiguity', 'undefined scope', 'discovery gap', 'missing scope', 'unclear deliverable', 'scope gap', 'scope unclear', 'unclear scope']
const TECHNICAL_KEYWORDS = ['technical', 'architecture', 'design', 'engineering', 'implementation', 'technical uncertainty']
const VENDOR_KEYWORDS = ['logistics', 'shipment', 'delivery', 'eta', 'vendor', 'supplier', 'freight']

function matchesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some((kw) => lower.includes(kw))
}

function candidateKey(type: PMOInterventionType, projects: string[]): string {
  return `${type}::${[...projects].sort().join(',')}`
}

function makeCandidate(
  id: string,
  type: PMOInterventionType,
  title: string,
  description: string,
  affectedProjects: string[],
  ownerLane: PMOOwnerLane,
  escalationRequired: boolean,
  rationale: string
): PMOInterventionCandidate {
  return {
    id,
    type,
    title,
    description,
    affectedProjects,
    urgency: 'medium',
    ownerLane,
    requiredEvidence: [],
    recommendedCadence: '',
    escalationRequired,
    status: 'proposed',
    rationale,
  }
}

export function detectPMOInterventions(input: PMOInterventionInput): PMOInterventionCandidate[] {
  const candidates: PMOInterventionCandidate[] = []
  const seen = new Set<string>()

  function add(candidate: PMOInterventionCandidate): void {
    const key = candidateKey(candidate.type, candidate.affectedProjects)
    if (seen.has(key)) return
    seen.add(key)
    candidates.push(candidate)
  }

  const projects = input.portfolioContext.activeProjects
  const allIds = projects.map((p) => p.projectId)

  for (const project of projects) {
    const pid = project.projectId
    const name = project.projectName ?? pid

    // A) Financial blockers
    for (const blocker of project.blockers ?? []) {
      if (matchesAny(blocker, FINANCIAL_KEYWORDS)) {
        add(makeCandidate(
          `financial-impediment-${pid}`,
          'financial_impediment',
          `Financial Impediment: ${name}`,
          `Financial blocker detected for project ${name}: "${blocker}"`,
          [pid],
          'finance_lead',
          false,
          `Project ${name} has a financial blocker that must be resolved before delivery can continue.`
        ))
        break
      }
    }

    // B) Missing client inputs or low-health client dependency
    const hasMissingInputs = (project.missingInputs ?? []).length > 0
    const hasLowHealthClientDep = project.clientDependency === true && project.healthScore < 60
    if (hasMissingInputs || hasLowHealthClientDep) {
      add(makeCandidate(
        `client-input-request-${pid}`,
        'client_input_request',
        `Client Input Request: ${name}`,
        `Project ${name} is missing required client inputs that are blocking progress.`,
        [pid],
        'project_manager',
        false,
        `Project ${name} has pending client dependencies or missing inputs that need resolution.`
      ))
    }

    // C) Scope uncertainty — risks or blockers
    const scopeBlockers = (project.blockers ?? []).filter((b) => matchesAny(b, SCOPE_KEYWORDS))
    const scopeRisks = (project.risks ?? []).filter((r) => matchesAny(r, SCOPE_KEYWORDS))
    if (scopeBlockers.length > 0 || scopeRisks.length > 0) {
      const source = [...scopeBlockers, ...scopeRisks][0]
      const isTechnical = matchesAny(source, TECHNICAL_KEYWORDS)
      const interventionType: PMOInterventionType = isTechnical ? 'technical_validation_session' : 'scope_freeze'
      const ownerLane: PMOOwnerLane = isTechnical ? 'technical_lead' : 'project_manager'
      const label = interventionType === 'scope_freeze' ? 'Scope Freeze' : 'Technical Validation Session'
      add(makeCandidate(
        `${interventionType}-${pid}`,
        interventionType,
        `${label}: ${name}`,
        `Scope ambiguity detected for project ${name}: "${source}"`,
        [pid],
        ownerLane,
        false,
        `Project ${name} has unresolved scope uncertainty that must be clarified before work proceeds.`
      ))
    }

    // D) Pending dependencies
    if ((project.pendingDependencies ?? []).length > 0) {
      add(makeCandidate(
        `dependency-unblock-${pid}`,
        'dependency_unblock',
        `Dependency Unblock: ${name}`,
        `Project ${name} has ${project.pendingDependencies!.length} unresolved pending dependency(ies).`,
        [pid],
        'technical_lead',
        false,
        `Project ${name} is blocked by ${project.pendingDependencies!.length} pending dependencies that require resolution.`
      ))
    }

    // E) Vendor/logistics dependency — flag or matching blocker
    const vendorBlockers = (project.blockers ?? []).filter((b) => matchesAny(b, VENDOR_KEYWORDS))
    if (project.vendorDependency === true || vendorBlockers.length > 0) {
      add(makeCandidate(
        `vendor-logistics-followup-${pid}`,
        'vendor_logistics_followup',
        `Vendor/Logistics Follow-Up: ${name}`,
        `Project ${name} has a vendor or logistics dependency that requires follow-up.`,
        [pid],
        'logistics_lead',
        false,
        `Project ${name} depends on vendor/logistics confirmation to proceed.`
      ))
    }

    // F) Resource pressure >= 75
    if ((project.resourcePressure ?? 0) >= 75) {
      add(makeCandidate(
        `resource-reassignment-${pid}`,
        'resource_reassignment',
        `Resource Reassignment: ${name}`,
        `Project ${name} has critical resource pressure (${project.resourcePressure}).`,
        [pid],
        'pmo_director',
        false,
        `Project ${name} is under significant resource pressure that requires PMO rebalancing.`
      ))
    }

    // G) Timeline pressure >= 80
    if ((project.timelinePressure ?? 0) >= 80) {
      add(makeCandidate(
        `delivery-rebaseline-${pid}`,
        'delivery_rebaseline',
        `Delivery Rebaseline: ${name}`,
        `Project ${name} has critical timeline pressure (${project.timelinePressure}).`,
        [pid],
        'project_manager',
        false,
        `Project ${name} requires timeline rebaseline due to significant schedule pressure.`
      ))
    }

    // H) Stakeholder pressure >= 75
    if ((project.stakeholderPressure ?? 0) >= 75) {
      add(makeCandidate(
        `stakeholder-alignment-${pid}`,
        'stakeholder_alignment',
        `Stakeholder Alignment: ${name}`,
        `Project ${name} has elevated stakeholder pressure (${project.stakeholderPressure}).`,
        [pid],
        'project_manager',
        false,
        `Project ${name} requires stakeholder alignment to manage competing expectations.`
      ))
    }

    // I) Executive visibility + health < 60
    if (project.executiveVisibility === true && project.healthScore < 60) {
      const isBlocked = project.status === 'blocked' || (project.blockers ?? []).length > 0
      if (isBlocked || project.healthScore < 40) {
        add(makeCandidate(
          `executive-arbitration-${pid}`,
          'executive_arbitration',
          `Executive Arbitration: ${name}`,
          `Project ${name} requires executive arbitration due to low health (${project.healthScore}) and executive visibility.`,
          [pid],
          'pmo_director',
          true,
          `Project ${name} has executive visibility and is critically unhealthy, requiring direct executive intervention.`
        ))
      } else {
        add(makeCandidate(
          `escalation-cadence-${pid}`,
          'escalation_cadence',
          `Escalation Cadence: ${name}`,
          `Project ${name} requires an escalation cadence due to declining health (${project.healthScore}) under executive scrutiny.`,
          [pid],
          'pmo_director',
          true,
          `Project ${name} is under executive visibility with declining health, requiring a structured escalation cadence.`
        ))
      }
    }
  }

  // J) Conflict signals — high or critical severity
  for (const conflict of input.conflictSignals ?? []) {
    if (conflict.severity === 'high' || conflict.severity === 'critical') {
      add(makeCandidate(
        `executive-arbitration-conflict-${conflict.conflictId}`,
        'executive_arbitration',
        `Executive Arbitration: Portfolio Conflict ${conflict.conflictId}`,
        `Portfolio conflict ${conflict.conflictId} (${conflict.type}) at ${conflict.severity} severity requires executive arbitration.`,
        conflict.involvedProjects,
        'pmo_director',
        true,
        `Portfolio conflict of ${conflict.severity} severity requires executive arbitration to resolve cross-project tensions.`
      ))
    }
  }

  // K) Load balancing signals — high or critical operational risk
  const lb = input.loadBalancingSignals
  if (lb && (lb.operationalRiskLevel === 'high' || lb.operationalRiskLevel === 'critical')) {
    const isCritical = lb.operationalRiskLevel === 'critical'
    add(makeCandidate(
      'resource-reassignment-portfolio-load',
      'resource_reassignment',
      'Portfolio Load Resource Reassignment',
      `Portfolio load balancing indicates ${lb.operationalRiskLevel} operational risk requiring resource redistribution.`,
      allIds,
      'pmo_director',
      isCritical,
      `Portfolio load balancing score indicates ${lb.operationalRiskLevel} operational risk. Resource redistribution is required.`
    ))
    add(makeCandidate(
      'escalation-cadence-portfolio-load',
      'escalation_cadence',
      'Portfolio Load Escalation Cadence',
      `Portfolio operational risk is ${lb.operationalRiskLevel}. Escalation cadence required to monitor rebalancing.`,
      allIds,
      'pmo_director',
      true,
      'Portfolio-wide operational risk requires ongoing escalation cadence until load is controlled.'
    ))
  }

  // L) Decision simulation signals
  for (const decision of input.decisionSimulationSignals ?? []) {
    const rec = decision.recommendation
    if (rec === 'escalate') {
      add(makeCandidate(
        `executive-arbitration-decision-${decision.decisionId}`,
        'executive_arbitration',
        `Executive Arbitration: Decision ${decision.decisionId}`,
        `Decision simulation ${decision.decisionId} recommends escalation (confidence: ${decision.confidenceScore}).`,
        allIds,
        'pmo_director',
        true,
        `Executive decision simulation recommends escalation for decision ${decision.decisionId}.`
      ))
    } else if (rec === 'approve_with_conditions') {
      add(makeCandidate(
        `risk-control-review-decision-${decision.decisionId}`,
        'risk_control_review',
        `Risk Control Review: Decision ${decision.decisionId}`,
        `Decision ${decision.decisionId} approved with conditions — risk control review required.`,
        allIds,
        'project_manager',
        false,
        `Decision ${decision.decisionId} was approved with conditions, requiring risk control review before full execution.`
      ))
    } else if (rec === 'defer') {
      add(makeCandidate(
        `delivery-rebaseline-decision-${decision.decisionId}`,
        'delivery_rebaseline',
        `Delivery Rebaseline: Decision ${decision.decisionId} Deferred`,
        `Decision ${decision.decisionId} has been deferred — delivery rebaseline required across affected projects.`,
        allIds,
        'project_manager',
        false,
        `Deferred decision ${decision.decisionId} requires portfolio delivery rebaseline to reflect updated timelines.`
      ))
    }
  }

  return candidates
}

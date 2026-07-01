import type { DashboardAction } from '../action-center'
import { applyDashboardApprovalDecision } from './approval-decision-engine'
import { evaluateDashboardApprovalPolicy, resolveDashboardApprovalPolicy } from './approval-policy-engine'
import { buildDashboardApprovalWorkflowReport } from './approval-report-builder'
import { buildDashboardApprovalRequest } from './approval-request-builder'
import { routeDashboardApprovalApprovers } from './approver-routing-engine'
import type {
  DashboardApprovalDecision,
  DashboardApprovalRequest,
  DashboardApprovalRiskLevel,
  DashboardApprovalWorkflowInput,
  DashboardApprovalWorkflowReport,
} from './types'

const RISK_RANK: Record<DashboardApprovalRiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 }

function pickLatestDecisionByRequestId(decisions: DashboardApprovalDecision[]): Map<string, DashboardApprovalDecision> {
  const sorted = [...decisions].sort((a, b) => new Date(a.decidedAt).getTime() - new Date(b.decidedAt).getTime())
  const map = new Map<string, DashboardApprovalDecision>()
  for (const decision of sorted) map.set(decision.requestId, decision)
  return map
}

function indexActions(actions: DashboardAction[] = []): Map<string, DashboardAction> {
  return new Map(actions.map((action) => [action.id, action]))
}

export function runDashboardApprovalWorkflow(input: DashboardApprovalWorkflowInput): DashboardApprovalWorkflowReport {
  const policy = resolveDashboardApprovalPolicy(input.policy)
  const generatedAt = input.now ?? new Date().toISOString()
  const actionsById = indexActions(input.actions)
  const existingByEnvelopeId = new Map((input.existingRequests ?? []).map((request) => [request.envelopeId, request]))
  const latestDecisionByRequestId = pickLatestDecisionByRequestId(input.decisions ?? [])

  const requests: DashboardApprovalRequest[] = []

  for (const envelope of input.envelopes) {
    const action = actionsById.get(envelope.actionId)
    const evaluation = evaluateDashboardApprovalPolicy({ envelope, action, policy })
    const routedLanes = routeDashboardApprovalApprovers({ envelope, action, evaluation })
    const request = buildDashboardApprovalRequest({
      envelope,
      action,
      evaluation: { ...evaluation, requiredApproverLanes: routedLanes },
      policy,
      now: generatedAt,
    })

    const existing = existingByEnvelopeId.get(envelope.id)
    const merged = existing
      ? RISK_RANK[request.riskLevel] > RISK_RANK[existing.riskLevel]
        ? { ...existing, ...request }
        : {
            ...request,
            status: existing.status,
            reasons: [...existing.reasons],
            riskLevel: existing.riskLevel,
            requiredApproverLanes: [...existing.requiredApproverLanes],
          }
      : request

    const decision = latestDecisionByRequestId.get(merged.id)
    requests.push(applyDashboardApprovalDecision({ request: merged, decision, now: generatedAt }))
  }

  const decisions = [...(input.decisions ?? [])]
  return buildDashboardApprovalWorkflowReport({
    generatedAt,
    envelopes: [...input.envelopes],
    requests,
    decisions,
  })
}

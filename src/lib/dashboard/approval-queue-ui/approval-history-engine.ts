import type { DashboardApprovalDecision } from '../approval-workflow/index'
import type { DashboardApprovalDecisionView } from './types'

export function buildApprovalDecisionHistory(decisions: DashboardApprovalDecision[] = []): DashboardApprovalDecisionView[] {
  return decisions
    .slice()
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
    .map((decision) => ({
      decision: decision.decision,
      decidedBy: decision.decidedBy,
      decidedAt: decision.decidedAt,
      comment: decision.comment,
    }))
}

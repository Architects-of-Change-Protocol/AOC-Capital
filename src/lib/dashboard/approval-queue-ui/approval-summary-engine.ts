import type { DashboardApprovalQueueCard, DashboardApprovalQueueSummary } from './types'

export function buildApprovalQueueSummary(cards: DashboardApprovalQueueCard[]): DashboardApprovalQueueSummary {
  const summary: DashboardApprovalQueueSummary = {
    totalCards: cards.length,
    actionRequired: cards.filter((card) => card.state === 'action_required').length,
    blocked: cards.filter((card) => card.state === 'blocked').length,
    approved: cards.filter((card) => card.state === 'approved').length,
    rejected: cards.filter((card) => card.state === 'rejected').length,
    expired: cards.filter((card) => card.state === 'expired').length,
    retryAttention: cards.filter((card) => card.state === 'retry_attention').length,
    executiveSummary: '',
  }

  if (summary.actionRequired > 0) summary.executiveSummary = `PMFreak requires approval action on ${summary.actionRequired} queue item(s).`
  else if (summary.retryAttention > 0) summary.executiveSummary = `PMFreak detected ${summary.retryAttention} execution retry attention item(s).`
  else if (summary.blocked > 0) summary.executiveSummary = `PMFreak has ${summary.blocked} blocked approval queue item(s).`
  else if (summary.totalCards > 0 && cards.every((card) => card.state === 'completed')) summary.executiveSummary = 'All approval queue items have completed execution.'
  else summary.executiveSummary = 'No approval queue actions currently require attention.'

  return summary
}

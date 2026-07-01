import type { PMOInterventionCandidate } from './types'

export function generateRecommendedCadence(candidate: PMOInterventionCandidate): string {
  const { type, urgency } = candidate

  if (type === 'financial_impediment' && (urgency === 'critical' || urgency === 'high')) {
    return 'Daily finance/logistics checkpoint until PO/payment blocker is resolved'
  }
  if (type === 'vendor_logistics_followup') {
    return 'Every 48 hours until ETA is confirmed and delivery risk is controlled'
  }
  if (type === 'client_input_request' && (urgency === 'high' || urgency === 'critical')) {
    return 'Daily client follow-up until required inputs are received'
  }
  if (type === 'executive_arbitration') {
    return 'Immediate executive review followed by 48-hour decision checkpoint'
  }
  if (type === 'scope_freeze') {
    return 'Freeze scope changes until validation session and decision record are completed'
  }

  if (urgency === 'critical') return 'Daily checkpoint until unblocked'
  if (urgency === 'high') return 'Every 48 hours until controlled'
  if (urgency === 'medium') return 'Twice weekly follow-up'
  return 'Weekly governance review'
}

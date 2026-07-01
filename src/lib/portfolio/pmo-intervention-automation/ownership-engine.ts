import type { PMOInterventionCandidate, PMOOwnerLane } from './types'

const OWNERSHIP_MAP: Record<string, PMOOwnerLane> = {
  financial_impediment: 'finance_lead',
  executive_arbitration: 'pmo_director',
  resource_reassignment: 'pmo_director',
  client_input_request: 'project_manager',
  scope_freeze: 'project_manager',
  dependency_unblock: 'technical_lead',
  vendor_logistics_followup: 'logistics_lead',
  technical_validation_session: 'technical_lead',
  stakeholder_alignment: 'project_manager',
  risk_control_review: 'project_manager',
  delivery_rebaseline: 'project_manager',
  escalation_cadence: 'pmo_director',
}

export function assignInterventionOwnerLane(candidate: PMOInterventionCandidate): PMOOwnerLane {
  return OWNERSHIP_MAP[candidate.type] ?? 'project_manager'
}

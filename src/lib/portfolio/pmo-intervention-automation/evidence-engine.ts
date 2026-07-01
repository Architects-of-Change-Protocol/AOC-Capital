import type { PMOInterventionCandidate } from './types'

const EVIDENCE_MAP: Record<string, string[]> = {
  financial_impediment: [
    'Purchase order status',
    'Vendor payment confirmation',
    'Internal approval record',
    'Financial blocker description',
  ],
  executive_arbitration: [
    'Portfolio conflict summary',
    'Impacted projects list',
    'Decision options',
    'Recommendation rationale',
  ],
  resource_reassignment: [
    'Current assignment map',
    'Capacity pressure evidence',
    'Priority justification',
    'Expected impact',
  ],
  client_input_request: [
    'List of missing inputs',
    'Previous request history',
    'Impact of no-response',
    'Requested response deadline',
  ],
  scope_freeze: [
    'Scope ambiguity summary',
    'Affected deliverables',
    'Discovery questions',
    'Approval required to resume',
  ],
  dependency_unblock: [
    'Dependency list',
    'Blocking owner',
    'Required unblock action',
    'Target unblock date',
  ],
  vendor_logistics_followup: [
    'Vendor confirmation',
    'ETA / shipment status',
    'Purchase order reference',
    'Delivery dependency impact',
  ],
  technical_validation_session: [
    'Technical uncertainty list',
    'Required attendees',
    'Validation agenda',
    'Decision record template',
  ],
  stakeholder_alignment: [
    'Stakeholder map',
    'Pending approvals',
    'Alignment agenda',
    'Decision owners',
  ],
  risk_control_review: [
    'Risk register evidence',
    'Mitigation status',
    'Residual risk assessment',
    'Control owner',
  ],
  delivery_rebaseline: [
    'Current timeline',
    'Variance reason',
    'Proposed revised baseline',
    'Client/internal approval requirement',
  ],
  escalation_cadence: [
    'Escalation log',
    'Executive owner',
    'Cadence proposal',
    'Exit criteria',
  ],
}

export function generateRequiredEvidence(candidate: PMOInterventionCandidate): string[] {
  return EVIDENCE_MAP[candidate.type] ?? []
}

import type { DashboardAuthorizationActor, DashboardAuthorizationCapability, DashboardActorRole } from './types'

export const DASHBOARD_CAPABILITY_ORDER: DashboardAuthorizationCapability[] = [
  'view_queue_item','view_sensitive_item','approve','reject','request_changes','trigger_manual_push','trigger_live_execution','retry_execution','cancel_lifecycle','override_approval','view_audit_trail',
]

const ROLE_CAPABILITIES: Record<DashboardActorRole, DashboardAuthorizationCapability[]> = {
  viewer: ['view_queue_item'],
  project_manager: ['view_queue_item', 'approve', 'reject', 'request_changes', 'trigger_manual_push', 'view_audit_trail'],
  technical_lead: ['view_queue_item', 'approve', 'request_changes', 'retry_execution', 'view_audit_trail'],
  finance_lead: ['view_queue_item', 'view_sensitive_item', 'approve', 'reject', 'request_changes', 'view_audit_trail'],
  executive_sponsor: ['view_queue_item', 'view_sensitive_item', 'approve', 'reject', 'request_changes', 'override_approval', 'trigger_live_execution', 'view_audit_trail'],
  pmo_director: ['view_queue_item', 'view_sensitive_item', 'approve', 'reject', 'request_changes', 'trigger_manual_push', 'trigger_live_execution', 'retry_execution', 'cancel_lifecycle', 'override_approval', 'view_audit_trail'],
  security_owner: ['view_queue_item', 'view_sensitive_item', 'approve', 'reject', 'request_changes', 'view_audit_trail'],
  system_owner: ['view_queue_item', 'view_sensitive_item', 'trigger_live_execution', 'retry_execution', 'cancel_lifecycle', 'view_audit_trail'],
  admin: [...DASHBOARD_CAPABILITY_ORDER],
}

export function getRoleCapabilities (role: DashboardActorRole): DashboardAuthorizationCapability[] { return [...ROLE_CAPABILITIES[role]] }

export function resolveActorCapabilities (actor: DashboardAuthorizationActor): DashboardAuthorizationCapability[] {
  const granted = new Set<DashboardAuthorizationCapability>()
  for (const role of actor.roles) for (const capability of getRoleCapabilities(role)) granted.add(capability)
  return DASHBOARD_CAPABILITY_ORDER.filter(cap => granted.has(cap))
}

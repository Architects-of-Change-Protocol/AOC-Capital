import type { DashboardTaskAdapterKind, DashboardTaskAdapterCapability } from './types'

const CAPABILITY_MATRIX: Record<DashboardTaskAdapterKind, DashboardTaskAdapterCapability> = {
  jira: {
    supportsPriority: true,
    supportsAssignee: true,
    supportsDueDate: true,
    supportsLabels: true,
    supportsDescription: true,
    supportsEscalationMetadata: true,
    supportsEvidenceRequirements: true,
    supportsExecutionLane: true,
  },
  linear: {
    supportsPriority: true,
    supportsAssignee: true,
    supportsDueDate: false,
    supportsLabels: true,
    supportsDescription: true,
    supportsEscalationMetadata: false,
    supportsEvidenceRequirements: false,
    supportsExecutionLane: false,
  },
  asana: {
    supportsPriority: true,
    supportsAssignee: true,
    supportsDueDate: true,
    supportsLabels: false,
    supportsDescription: true,
    supportsEscalationMetadata: false,
    supportsEvidenceRequirements: false,
    supportsExecutionLane: false,
  },
  clickup: {
    supportsPriority: true,
    supportsAssignee: true,
    supportsDueDate: true,
    supportsLabels: true,
    supportsDescription: true,
    supportsEscalationMetadata: true,
    supportsEvidenceRequirements: true,
    supportsExecutionLane: true,
  },
  email_queue: {
    supportsPriority: false,
    supportsAssignee: false,
    supportsDueDate: false,
    supportsLabels: false,
    supportsDescription: true,
    supportsEscalationMetadata: true,
    supportsEvidenceRequirements: false,
    supportsExecutionLane: false,
  },
  atenea: {
    supportsPriority: true,
    supportsAssignee: false,
    supportsDueDate: false,
    supportsLabels: false,
    supportsDescription: true,
    supportsEscalationMetadata: true,
    supportsEvidenceRequirements: true,
    supportsExecutionLane: true,
  },
  internal_runtime: {
    supportsPriority: true,
    supportsAssignee: true,
    supportsDueDate: true,
    supportsLabels: true,
    supportsDescription: true,
    supportsEscalationMetadata: true,
    supportsEvidenceRequirements: true,
    supportsExecutionLane: true,
  },
}

export function getDashboardTaskAdapterCapabilities(
  adapter: DashboardTaskAdapterKind,
): DashboardTaskAdapterCapability {
  return CAPABILITY_MATRIX[adapter]
}

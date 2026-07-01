import type { DashboardAction } from '../action-center'
import type { DashboardTaskAdapterKind } from './types'

const KNOWN_ADAPTERS = new Set<DashboardTaskAdapterKind>([
  'jira', 'linear', 'asana', 'clickup', 'email_queue', 'atenea', 'internal_runtime',
])

export function validateDashboardTaskProjection(input: {
  adapter: DashboardTaskAdapterKind
  action: DashboardAction
}): { valid: boolean; warnings: string[]; errors: string[] } {
  const { adapter, action } = input
  const warnings: string[] = []
  const errors: string[] = []

  if (!KNOWN_ADAPTERS.has(adapter)) {
    errors.push(`Unsupported adapter: ${adapter}`)
  }

  if (!action.title || action.title.trim() === '') {
    errors.push('Action title is required')
  }

  if (!action.description || action.description.trim() === '') {
    errors.push('Action description is required')
  }

  if (adapter === 'email_queue') {
    warnings.push('Assignee omitted: email_queue adapter does not support assignee field')
  }

  if (adapter === 'internal_runtime') {
    return { valid: true, warnings, errors: [] }
  }

  return { valid: errors.length === 0, warnings, errors }
}

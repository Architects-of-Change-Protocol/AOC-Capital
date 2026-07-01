import type {
  DashboardRefreshWorkerTrigger,
  DashboardRefreshExecutionMode,
  DashboardSourceRefreshExecution,
  DashboardBackgroundRefreshReport,
  DashboardRefreshWorkerStatus,
} from './types'

export function buildDashboardBackgroundRefreshReport(input: {
  trigger: DashboardRefreshWorkerTrigger
  mode: DashboardRefreshExecutionMode
  generatedAt: string
  executions: DashboardSourceRefreshExecution[]
  skippedReason?: string
  warnings?: string[]
}): DashboardBackgroundRefreshReport {
  const { trigger, mode, generatedAt, executions, skippedReason, warnings = [] } = input

  const attemptedSources = executions.length
  const refreshedSources = executions.filter((e) => e.status === 'refreshed').length
  const skippedSources = executions.filter((e) => e.status === 'skipped').length
  const failedSources = executions.filter((e) => e.status === 'failed').length

  let status: DashboardRefreshWorkerStatus
  if (attemptedSources === 0) {
    status = 'skipped'
  } else if (failedSources > 0 && refreshedSources === 0) {
    status = 'failed'
  } else if (failedSources > 0 && refreshedSources > 0) {
    status = 'partial'
  } else {
    status = 'completed'
  }

  const allWarnings: string[] = [...warnings]
  if (skippedReason) allWarnings.push(skippedReason)
  for (const exec of executions) {
    if ((exec.status === 'skipped' || exec.status === 'failed') && exec.error) {
      allWarnings.push(`[${exec.sourceKind}] ${exec.error}`)
    }
  }

  return {
    status,
    trigger,
    mode,
    generatedAt,
    attemptedSources,
    refreshedSources,
    skippedSources,
    failedSources,
    executions,
    warnings: allWarnings,
  }
}

import type { DashboardTaskLifecycleEvent, DashboardTaskLifecycleRecord, DashboardTaskLifecycleReport } from './types'

export function buildDashboardTaskLifecycleReport(input: {
  generatedAt: string
  lifecycles: DashboardTaskLifecycleRecord[]
  events: DashboardTaskLifecycleEvent[]
}): DashboardTaskLifecycleReport {
  const readyForExecution = input.lifecycles.filter((l) => l.status === 'ready_for_execution').length
  const blocked = input.lifecycles.filter((l) => ['approval_pending', 'execution_blocked', 'rejected', 'changes_requested', 'expired'].includes(l.status)).length
  const approved = input.lifecycles.filter((l) => l.status === 'approved' || l.status === 'ready_for_execution').length
  const rejected = input.lifecycles.filter((l) => l.status === 'rejected').length
  const simulated = input.lifecycles.filter((l) => l.status === 'execution_simulated').length
  const failed = input.lifecycles.filter((l) => l.status === 'execution_failed').length
  const completed = input.lifecycles.filter((l) => l.status === 'execution_completed').length

  let executiveSummary = 'No task lifecycle records require execution.'
  if (readyForExecution > 0) executiveSummary = `PMFreak has ${readyForExecution} lifecycle record(s) ready for execution.`
  else if (blocked > 0) executiveSummary = `PMFreak has ${blocked} lifecycle record(s) blocked by approval or execution gates.`
  else if (simulated > 0 && readyForExecution === 0 && blocked === 0) executiveSummary = `PMFreak simulated ${simulated} lifecycle record(s); no external execution occurred.`

  return { generatedAt: input.generatedAt, totalLifecycles: input.lifecycles.length, readyForExecution, blocked, approved, rejected, simulated, failed, completed, eventsCreated: input.events.length, lifecycles: [...input.lifecycles], events: [...input.events], executiveSummary }
}

import type { DashboardActionExecutionLane } from '@/lib/dashboard/action-center'
import { EXECUTION_LANE_LABELS } from './utils'

export { EXECUTION_LANE_LABELS }

export function ActionExecutionLaneBadge({ executionLane }: { executionLane: DashboardActionExecutionLane }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-slate-600/40 bg-slate-700/30 px-1.5 py-0.5 text-[10px] text-slate-300">
      <span className="text-slate-500">Lane</span>
      {EXECUTION_LANE_LABELS[executionLane] ?? executionLane}
    </span>
  )
}

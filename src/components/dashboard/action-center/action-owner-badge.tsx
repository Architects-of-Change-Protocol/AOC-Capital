import type { DashboardActionOwnerLane } from '@/lib/dashboard/action-center'
import { OWNER_LANE_LABELS } from './utils'

export { OWNER_LANE_LABELS }

export function ActionOwnerBadge({ ownerLane }: { ownerLane: DashboardActionOwnerLane }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-cyan-700/40 bg-cyan-900/30 px-1.5 py-0.5 text-[10px] text-cyan-200">
      <span className="text-cyan-400/70">Owner</span>
      {OWNER_LANE_LABELS[ownerLane] ?? ownerLane}
    </span>
  )
}

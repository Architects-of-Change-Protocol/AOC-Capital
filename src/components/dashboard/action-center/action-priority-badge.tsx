import type { DashboardActionPriority } from '@/lib/dashboard/action-center'
import { PRIORITY_BADGE_STYLES, PRIORITY_BADGE_LABELS } from './utils'

export { PRIORITY_BADGE_STYLES, PRIORITY_BADGE_LABELS }

export function ActionPriorityBadge({ priority }: { priority: DashboardActionPriority }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-widest ${PRIORITY_BADGE_STYLES[priority]}`}
    >
      {PRIORITY_BADGE_LABELS[priority]}
    </span>
  )
}

import type { DashboardAction } from '@/lib/dashboard/action-center'
import { PRIORITY_GROUP_LABELS, groupActionsByPriority } from './utils'
import { DashboardActionCard } from './dashboard-action-card'

export { PRIORITY_GROUP_LABELS, groupActionsByPriority }

export function DashboardActionQueue({ actions }: { actions: DashboardAction[] }) {
  if (!actions.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="text-sm text-slate-400">No operational actions currently required.</p>
      </div>
    )
  }
  const groups = groupActionsByPriority(actions)
  return (
    <div className="space-y-6">
      {groups.map(group => (
        <div key={group.priority} className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {PRIORITY_GROUP_LABELS[group.priority]}
            </p>
            <span className="text-xs text-slate-500">({group.actions.length})</span>
          </div>
          {group.actions.map(action => (
            <DashboardActionCard key={action.id} action={action} />
          ))}
        </div>
      ))}
    </div>
  )
}

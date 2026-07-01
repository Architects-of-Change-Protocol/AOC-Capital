import type { DashboardAction } from '@/lib/dashboard/action-center'
import { ActionPriorityBadge } from './action-priority-badge'
import { ActionOwnerBadge } from './action-owner-badge'
import { ActionExecutionLaneBadge } from './action-execution-lane-badge'
import { ActionSLADisplay } from './action-sla-display'
import { ActionEscalationIndicator } from './action-escalation-indicator'

export function DashboardActionCard({ action }: { action: DashboardAction }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium text-slate-100 text-sm leading-snug">{action.title}</p>
        <ActionPriorityBadge priority={action.priority} />
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{action.description}</p>
      <div className="flex flex-wrap gap-2">
        <ActionOwnerBadge ownerLane={action.ownerLane} />
        <ActionExecutionLaneBadge executionLane={action.executionLane} />
      </div>
      <ActionSLADisplay sla={action.sla} />
      <ActionEscalationIndicator route={action.escalationRoute} />
      {action.affectedProjects.length > 0 && (
        <p className="text-xs text-slate-500">
          {action.affectedProjects.length} project{action.affectedProjects.length !== 1 ? 's' : ''} affected
        </p>
      )}
      {action.evidenceRequired.length > 0 && (
        <p className="text-xs text-slate-500">
          {action.evidenceRequired.length} evidence item{action.evidenceRequired.length !== 1 ? 's' : ''} required
        </p>
      )}
    </div>
  )
}

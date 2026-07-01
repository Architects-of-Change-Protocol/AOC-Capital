import type { DashboardAction } from '@/lib/dashboard/action-center'
import { ActionPriorityBadge } from './action-priority-badge'
import { ActionOwnerBadge } from './action-owner-badge'
import { ActionExecutionLaneBadge } from './action-execution-lane-badge'
import { ActionSLADisplay } from './action-sla-display'
import { ActionEscalationIndicator } from './action-escalation-indicator'

export function DashboardNextActionPanel({ action }: { action?: DashboardAction }) {
  if (!action) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Recommended Next Action</p>
        <p className="mt-3 text-sm text-slate-400">No immediate action required.</p>
      </div>
    )
  }
  return (
    <div className="rounded-3xl border border-cyan-400/30 bg-cyan-950/30 p-5 space-y-4 shadow-[0_0_40px_-20px_rgba(34,211,238,0.15)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Recommended Next Action</p>
        <ActionPriorityBadge priority={action.priority} />
      </div>
      <div>
        <p className="font-semibold text-slate-50 text-base">{action.title}</p>
        <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">{action.description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ActionOwnerBadge ownerLane={action.ownerLane} />
        <ActionExecutionLaneBadge executionLane={action.executionLane} />
      </div>
      <ActionSLADisplay sla={action.sla} />
      <ActionEscalationIndicator route={action.escalationRoute} />
    </div>
  )
}

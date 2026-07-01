import type { DashboardActionEscalationRoute } from '@/lib/dashboard/action-center'
import { OWNER_LANE_LABELS } from './utils'

export function ActionEscalationIndicator({ route }: { route: DashboardActionEscalationRoute }) {
  if (!route.required) {
    return <p className="text-xs text-slate-500">No escalation required</p>
  }
  return (
    <div className="rounded border border-red-700/30 bg-red-900/20 px-2 py-1.5 text-xs space-y-0.5">
      <p className="text-red-300">
        Escalates to:{' '}
        <span className="font-medium">
          {route.routeTo ? (OWNER_LANE_LABELS[route.routeTo] ?? route.routeTo) : 'escalation team'}
        </span>
      </p>
      {route.reason && <p className="text-red-300/70">Reason: {route.reason}</p>}
    </div>
  )
}

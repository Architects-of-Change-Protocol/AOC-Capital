import type { DashboardActionSLA } from '@/lib/dashboard/action-center'

export function ActionSLADisplay({ sla }: { sla: DashboardActionSLA }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-400">
      <span>Response: <span className="text-slate-200">{sla.responseDueHours}h</span></span>
      <span>Resolution: <span className="text-slate-200">{sla.resolutionDueHours}h</span></span>
      <span>Cadence: <span className="text-slate-200">{sla.cadence}</span></span>
    </div>
  )
}

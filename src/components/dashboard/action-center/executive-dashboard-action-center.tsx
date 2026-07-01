import type { DashboardActionCenterReport } from '@/lib/dashboard/action-center'
import { DashboardActionSummary } from './dashboard-action-summary'
import { DashboardNextActionPanel } from './dashboard-next-action-panel'
import { DashboardActionQueue } from './dashboard-action-queue'

export function ExecutiveDashboardActionCenter({ report }: { report: DashboardActionCenterReport }) {
  if (report.totalActions === 0) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Operational Action Center</p>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
          <p className="text-sm font-medium text-slate-300">Operational State Clear</p>
          <p className="mt-1 text-xs text-slate-500">{report.executiveSummary}</p>
        </div>
      </section>
    )
  }
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 space-y-5">
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Operational Action Center</p>
      <DashboardActionSummary report={report} />
      <DashboardNextActionPanel action={report.recommendedNextAction} />
      <DashboardActionQueue actions={report.actions} />
    </section>
  )
}

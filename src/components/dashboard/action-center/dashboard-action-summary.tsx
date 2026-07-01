import type { DashboardActionCenterReport } from '@/lib/dashboard/action-center'

export function DashboardActionSummary({ report }: { report: DashboardActionCenterReport }) {
  const items = [
    { label: 'Total Actions', value: String(report.totalActions) },
    { label: 'Critical', value: String(report.criticalActions) },
    { label: 'Escalations', value: String(report.escalationRequiredCount) },
    { label: 'Recommended Action', value: report.recommendedNextAction ? 'Yes' : 'None' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(item => (
        <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center">
          <p className="text-lg font-bold text-cyan-200">{item.value}</p>
          <p className="mt-1 text-xs text-slate-400">{item.label}</p>
        </div>
      ))}
    </div>
  )
}

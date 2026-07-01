import type { ExecutiveInsight } from "@/lib/executive-synthesis";

export function ExecutiveAlerts({ insights }: { insights: ExecutiveInsight[] }) {
  return (
    <section className="rounded-2xl border border-slate-700 bg-white p-5">
      <h2 className="text-sm uppercase tracking-[0.2em] text-slate-400">Cross-domain Alerts</h2>
      <div className="mt-3 space-y-2">
        {insights.map((insight) => (
          <div key={insight.id} className="rounded-lg border border-slate-700 bg-white p-3">
            <p className="text-sm font-medium text-white">{insight.title}</p>
            <p className="text-xs text-slate-300">{insight.summary}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

import type { EscalationTransition } from "@/lib/escalation-thresholds";

export function EscalationThresholdCard({ transitions }: { transitions: EscalationTransition[] }) {
  if (!transitions.length) return <div className="rounded-lg border border-slate-700 bg-white p-3 text-sm text-slate-300">No escalation transitions in current window.</div>;
  return <div className="space-y-2">{transitions.map((t) => <div key={`${t.metric}-${t.timestamp}`} className="rounded-lg border border-amber-600/40 bg-white p-3 text-sm text-amber-100">{t.metric}: {t.from.toUpperCase()} → {t.to.toUpperCase()} (p={t.probability})</div>)}</div>;
}

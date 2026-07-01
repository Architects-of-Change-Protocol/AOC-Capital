import type { CrossDomainSignal } from "./cross-domain-correlation-types";

export function suppressCorrelationNoise(signals: CrossDomainSignal[], nowMs: number): CrossDomainSignal[] {
  const dedup = new Map<string, CrossDomainSignal>();
  for (const signal of signals) {
    if (signal.confidence < 0.25) continue;
    const ageDays = Math.max(0, (nowMs - Date.parse(signal.observedAt)) / 86400000);
    const staleDamping = ageDays > 45 ? 0.6 : 1;
    const stabilized: CrossDomainSignal = { ...signal, pressureContribution: signal.pressureContribution * staleDamping, severity: signal.severity * staleDamping };
    const key = `${stabilized.domain}:${stabilized.summary.toLowerCase()}`;
    const existing = dedup.get(key);
    if (!existing || stabilized.confidence > existing.confidence) dedup.set(key, stabilized);
  }
  return [...dedup.values()].filter((s)=>s.severity >= 0.15);
}

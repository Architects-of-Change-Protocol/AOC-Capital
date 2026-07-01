import type { TrendSeverity } from "@/lib/trend-analysis";

export type AlertSuppressionState = {
  key: string;
  lastSeverity: TrendSeverity;
  lastEmittedAt: string;
  repeatCount: number;
  suppressedUntil: string | null;
  resolvedAt: string | null;
};

export function shouldSuppressAlert(previous: AlertSuppressionState | null, currentSeverity: TrendSeverity, nowIso: string, cooldownMinutes = 120): { suppressed: boolean; nextState: AlertSuppressionState } {
  const now = Date.parse(nowIso);
  const severityRank: Record<TrendSeverity, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };

  if (!previous) {
    return { suppressed: false, nextState: { key: "", lastSeverity: currentSeverity, lastEmittedAt: nowIso, repeatCount: 0, suppressedUntil: null, resolvedAt: null } };
  }

  const worsened = severityRank[currentSeverity] > severityRank[previous.lastSeverity];
  const unchanged = severityRank[currentSeverity] === severityRank[previous.lastSeverity];
  const suppressedUntil = previous.suppressedUntil ? Date.parse(previous.suppressedUntil) : 0;

  if (worsened) {
    return { suppressed: false, nextState: { ...previous, lastSeverity: currentSeverity, lastEmittedAt: nowIso, repeatCount: 0, suppressedUntil: null } };
  }

  if (unchanged && now < suppressedUntil) {
    return { suppressed: true, nextState: { ...previous, repeatCount: previous.repeatCount + 1 } };
  }

  const nextSuppressedUntil = new Date(now + cooldownMinutes * 60_000).toISOString();
  return {
    suppressed: unchanged,
    nextState: { ...previous, lastSeverity: currentSeverity, lastEmittedAt: nowIso, repeatCount: unchanged ? previous.repeatCount + 1 : 0, suppressedUntil: nextSuppressedUntil, resolvedAt: currentSeverity === "info" ? nowIso : null },
  };
}

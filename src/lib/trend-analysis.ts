import type { EscalationLevel } from "@/lib/executive-health";

export type TrendDirection = "improving" | "stable" | "deteriorating" | "volatile" | "critical_deterioration";
export type TrendSeverity = "info" | "low" | "medium" | "high" | "critical";

export type TrendMovement = {
  metric: string;
  direction: TrendDirection;
  delta: number;
  rate: number;
  volatility: number;
  severity: TrendSeverity;
  executiveVisibility: number;
  businessImpact: number;
  domainImportance: number;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const calcVolatility = (series: number[]) => {
  if (series.length < 3) return 0;
  let turns = 0;
  for (let i = 2; i < series.length; i += 1) {
    const d1 = series[i - 1] - series[i - 2];
    const d2 = series[i] - series[i - 1];
    if (Math.sign(d1) !== Math.sign(d2) && Math.abs(d1) > 2 && Math.abs(d2) > 2) turns += 1;
  }
  return clamp((turns / (series.length - 2)) * 100);
};

export function analyzeTrend(metric: string, values: number[], input: { businessImpact: number; executiveVisibility: number; domainImportance: number }): TrendMovement {
  const sanitized = values.map((v) => clamp(v));
  const first = sanitized[0] ?? 0;
  const last = sanitized[sanitized.length - 1] ?? 0;
  const delta = last - first;
  const rate = sanitized.length > 1 ? delta / (sanitized.length - 1) : 0;
  const volatility = calcVolatility(sanitized);
  const deteriorationRate = Math.max(0, -rate) * 8;
  const weightedRisk = deteriorationRate * 0.35 + input.businessImpact * 0.25 + input.executiveVisibility * 0.2 + input.domainImportance * 0.2 + volatility * 0.15;

  const direction: TrendDirection = weightedRisk >= 82
    ? "critical_deterioration"
    : volatility >= 60
      ? "volatile"
      : delta > 6
        ? "improving"
        : delta < -6
          ? "deteriorating"
          : "stable";

  const severity: TrendSeverity = weightedRisk >= 85 ? "critical" : weightedRisk >= 65 ? "high" : weightedRisk >= 45 ? "medium" : weightedRisk >= 25 ? "low" : "info";

  return { metric, direction, delta: Math.round(delta), rate: Math.round(rate * 10) / 10, volatility, severity, ...input };
}

export function detectEscalationTransition(previous: EscalationLevel, current: EscalationLevel): { transitioned: boolean; from: EscalationLevel; to: EscalationLevel; severity: TrendSeverity } {
  const order: EscalationLevel[] = ["low", "medium", "high", "critical"];
  const prevIdx = order.indexOf(previous);
  const currIdx = order.indexOf(current);
  const moved = currIdx !== prevIdx;
  const up = currIdx > prevIdx;
  return {
    transitioned: moved,
    from: previous,
    to: current,
    severity: !moved ? "info" : currIdx === 3 ? "critical" : up ? "high" : "low",
  };
}

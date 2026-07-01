import type { TrendSeverity } from "@/lib/trend-analysis";

export type EscalationTransition = {
  metric: string;
  from: "low" | "medium" | "high" | "critical";
  to: "low" | "medium" | "high" | "critical";
  probability: number;
  severity: TrendSeverity;
  timestamp: string;
};

const band = (score: number): EscalationTransition["from"] => {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
};

export function computeEscalationTransition(metric: string, previousProbability: number, currentProbability: number, timestamp: string): EscalationTransition | null {
  const from = band(previousProbability);
  const to = band(currentProbability);
  if (from === to) return null;
  return {
    metric,
    from,
    to,
    probability: currentProbability,
    severity: to === "critical" ? "critical" : to === "high" ? "high" : "medium",
    timestamp,
  };
}

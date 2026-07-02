// AOC Capital Advisor — risk profile mapping.
// Combines the user's stated risk appetite with their max tolerable drawdown
// into one of four risk profiles, always taking the more conservative of the
// two signals — a user can't talk their way into a spicier profile than either
// answer alone would justify.

import type { AdvisorIntake, RiskAppetite, RiskProfile } from "./types";

const RISK_PROFILES: RiskProfile[] = ["conservative", "balanced", "growth", "aggressive"];

function drawdownIndex(maxTolerableDrawdownPct: number): number {
  if (maxTolerableDrawdownPct <= 10) return 0;
  if (maxTolerableDrawdownPct <= 20) return 1;
  if (maxTolerableDrawdownPct <= 35) return 2;
  return 3;
}

const APPETITE_INDEX: Record<RiskAppetite, number> = {
  conservative: 0,
  moderate: 2,
  aggressive: 3,
};

export function mapRiskProfile(intake: Pick<AdvisorIntake, "riskAppetite" | "maxTolerableDrawdownPct">): RiskProfile {
  const index = Math.min(drawdownIndex(intake.maxTolerableDrawdownPct), APPETITE_INDEX[intake.riskAppetite]);
  return RISK_PROFILES[index];
}

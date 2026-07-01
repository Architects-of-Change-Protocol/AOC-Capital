import type { PMImprintState } from "./operational-imprint-profile";

export type ContradictionResult = {
  hasContradiction: boolean;
  description: string | null;
};

const OPPOSING_SIGNALS: Record<string, string[]> = {
  delivery: ["stakeholder relationship", "political", "executive alignment", "governance review", "compliance audit"],
  stakeholders: ["execution blocker", "milestone slip", "sprint velocity", "dependency blocking", "delivery deadline"],
  governance: ["unblock now", "immediate action", "asap", "critical path", "delivery risk"],
  risk: ["ignore risk", "proceed without", "ship anyway", "skip review"],
};

// Detect if the current message signal strongly diverges from the established PM imprint.
// Only flags contradiction when the imprint is well-established (≥3 interactions, >70% dominance).
export function detectContradiction(
  currentMessage: string,
  imprintState: PMImprintState,
): ContradictionResult {
  if (imprintState.profile.observedInteractionCount < 3) {
    return { hasContradiction: false, description: null };
  }

  const lower = currentMessage.toLowerCase();
  const focus = imprintState.profile.dominantFocus;
  const opposing = OPPOSING_SIGNALS[focus] ?? [];
  const conflicting = opposing.filter((signal) => lower.includes(signal));

  if (conflicting.length === 0) {
    return { hasContradiction: false, description: null };
  }

  const scores = imprintState.scores.dominantFocus;
  const totalScore = (Object.values(scores) as number[]).reduce((a, b) => a + b, 0);
  const dominantScore = (scores[focus] as number | undefined) ?? 0;
  const dominance = totalScore > 0 ? dominantScore / totalScore : 0;

  if (dominance < 0.7) {
    return { hasContradiction: false, description: null };
  }

  return {
    hasContradiction: true,
    description: `PM previously ${focus}-first, current signal "${conflicting[0]}" — pattern divergence detected`,
  };
}

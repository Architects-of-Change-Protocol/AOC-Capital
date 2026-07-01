import { resolveActivationMilestones } from '../milestones/activation-milestones';
import { detectAhaMoment } from '../signals/aha-moment';
import { evaluateActivationProgression } from '../progression/activation-progression';
import { calculateActivationScores } from '../scoring/activation-scoring';
import { generateOperationalNudges } from '../nudges/operational-nudges';

export const advanceOperationalActivation = (input: { events: Array<{ type: string; id: string; correlationId: string; at: string }>; metrics: Record<string, number> }) => {
  const milestones = resolveActivationMilestones(input.events);
  const aha = detectAhaMoment(input.metrics);
  const scores = calculateActivationScores(input.metrics);
  const progression = evaluateActivationProgression({ continuityDepthScore: scores.continuityDepthScore, enterpriseExpansionScore: scores.enterpriseExpansionScore, recentInactivityDays: input.metrics.inactivityDays ?? 0, blockerSignals: [] });
  const nudges = generateOperationalNudges({ continuityDepthScore: scores.continuityDepthScore, unresolvedRiskCount: input.metrics.unresolvedRiskCount ?? 0, executiveAwarenessScore: scores.executiveAwarenessScore });
  const nextState = Object.freeze({ milestones, aha, scores, progression, nudges });
  return { state: nextState };
};

export const evaluateOperationalReadiness = calculateActivationScores;
export const generateOperationalGuidance = generateOperationalNudges;
export { detectAhaMoment, calculateActivationScores, resolveActivationMilestones, evaluateActivationProgression, generateOperationalNudges };

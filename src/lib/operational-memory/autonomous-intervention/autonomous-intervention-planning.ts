import type { InterventionCandidate, InterventionPlan } from "./autonomous-intervention-types";
import { buildInterventionSequence } from "./autonomous-intervention-sequencing";
export function buildInterventionPlan(candidates: InterventionCandidate[]): InterventionPlan { const sequence = buildInterventionSequence(candidates); return { topRecommendationId: candidates[0]?.interventionId, candidates, sequence }; }

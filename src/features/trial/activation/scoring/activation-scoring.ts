export type ActivationScores = {
  activationScore: number;
  operationalReadinessScore: number;
  continuityDepthScore: number;
  engagementIntensityScore: number;
  operationalMaturityScore: number;
  enterpriseExpansionScore: number;
  executiveAwarenessScore: number;
  ahaConfidenceScore: number;
};

export const calculateActivationScores = (input: Record<string, number>): ActivationScores => ({
  activationScore: Math.min(100, (input.milestones ?? 0) * 8 + (input.continuity ?? 0) * 4),
  operationalReadinessScore: Math.min(100, (input.continuity ?? 0) * 5 + (input.risk ?? 0) * 3),
  continuityDepthScore: Math.min(100, (input.continuity ?? 0) * 10),
  engagementIntensityScore: Math.min(100, (input.sessions ?? 0) * 7 + (input.ingestion ?? 0) * 4),
  operationalMaturityScore: Math.min(100, (input.dependencies ?? 0) * 6 + (input.memory ?? 0) * 4),
  enterpriseExpansionScore: Math.min(100, (input.collaborators ?? 0) * 12 + (input.executive ?? 0) * 20),
  executiveAwarenessScore: Math.min(100, (input.executive ?? 0) * 25),
  ahaConfidenceScore: Math.min(100, (input.ahaSignals ?? 0) * 20),
});

export type AhaMomentSignal =
  | 'continuity_recognition'
  | 'operational_memory_reuse'
  | 'repeated_multi_session_usage'
  | 'executive_synthesis_engagement'
  | 'operational_dependency_recognition'
  | 'stakeholder_cognition_engagement'
  | 'escalation_interaction'
  | 'repeated_ingestion_usage'
  | 'operational_reliance_patterns';

export type AhaMomentDetectionResult = {
  detected: boolean;
  confidence: number;
  signals: AhaMomentSignal[];
  rationale: string[];
};

export const detectAhaMoment = (input: Record<string, number>): AhaMomentDetectionResult => {
  const signals: AhaMomentSignal[] = [];
  if ((input.continuity_retrievals ?? 0) >= 2) signals.push('continuity_recognition');
  if ((input.memory_reuse ?? 0) >= 2) signals.push('operational_memory_reuse');
  if ((input.multi_session ?? 0) >= 2) signals.push('repeated_multi_session_usage');
  if ((input.executive_synthesis ?? 0) >= 1) signals.push('executive_synthesis_engagement');
  if ((input.ingestion_runs ?? 0) >= 3) signals.push('repeated_ingestion_usage');
  const confidence = Math.min(1, signals.length / 4);
  return { detected: confidence >= 0.75, confidence, signals, rationale: signals.map((s) => `detected:${s}`) };
};

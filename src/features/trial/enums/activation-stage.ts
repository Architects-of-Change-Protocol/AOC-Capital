export const ACTIVATION_STAGES = [
  'signup',
  'workspace_initialized',
  'first_project_created',
  'first_message_sent',
  'first_upload_completed',
  'first_memory_event',
  'first_risk_detected',
  'first_synthesis_generated',
  'continuity_established',
  'upgrade_ready',
] as const;

export type ActivationStage = (typeof ACTIVATION_STAGES)[number];

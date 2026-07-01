import type { ActivationStage } from '../enums/activation-stage';
import type { TrialStatus } from '../enums/trial-status';
import type { UpgradeReadiness } from '../enums/upgrade-readiness';

export type TenantScope = {
  companyId: string;
  workspaceId: string;
  userId: string;
};

export type NormalizedCapability = {
  key: string;
  enabled: boolean;
  scope?: string;
  metadata?: Record<string, unknown>;
};

export type TrialPlan = {
  id: string;
  name: string;
  maxProjects: number;
  maxUploads: number;
  maxMessages: number;
  maxStorageMb: number;
  operationalCapabilities: NormalizedCapability[];
  premiumCapabilities: NormalizedCapability[];
  collaborationLimits: {
    maxCollaborators: number;
    allowCrossWorkspaceVisibility: boolean;
  };
  exportLimits: {
    maxExportsPerWindow: number;
    permitAutomatedExports: boolean;
  };
  ingestionLimits: {
    maxIngestionOpsPerWindow: number;
    maxIngestionBatchSize: number;
  };
  metadata?: Record<string, unknown>;
};

export type TrialUsage = {
  messages: number;
  uploads: number;
  ingestionOps: number;
  synthesisGenerations: number;
  memoryOps: number;
  orchestrationOps: number;
  estimatedTokens: number;
  storageMb: number;
  usageBreakdown?: Record<string, number>;
  operationalEventCategories?: string[];
  orchestrationIntensity?: {
    score: number;
    band?: string;
  };
  intelligenceOperationCounts?: Record<string, number>;
  providerAbstractionMetadata?: Record<string, unknown>;
  runtimeConsumptionMetadata?: Record<string, unknown>;
  windowStartedAt: string;
  windowEndsAt: string;
  snapshots: Array<{ at: string; key: string; value: number }>;
};

export type LifecycleTransitionMetadata = {
  from: TrialStatus;
  to: TrialStatus;
  reason?: string;
  timestamp: string;
  actor?: string | null;
  metadata?: Record<string, unknown>;
};

export type ActivationState = {
  stage: ActivationStage;
  milestones: Record<ActivationStage, boolean>;
  ahaMoments: string[];
  nextActions: string[];
  operationalMaturityScore: number;
  continuitySignals: string[];
  activationSignals?: Record<string, unknown>;
  continuityIndicators?: Record<string, unknown>;
  engagementIndicators?: Record<string, unknown>;
  operationalComplexitySignals?: Record<string, unknown>;
};

export type OperationalCredits = {
  available: number;
  consumed: number;
  reserved: number;
  replenishmentRatePerWindow: number;
  lifecycleResetAt: string | null;
  softDepletionThreshold: number;
  hardDepleted: boolean;
};

export type TrialState = TenantScope & {
  id: string;
  status: TrialStatus;
  activationStage: ActivationStage;
  readiness: UpgradeReadiness;
  plan: TrialPlan;
  usage: TrialUsage;
  credits: OperationalCredits;
  activation: ActivationState;
  activatedAt: string | null;
  expiresAt: string;
  upgradedAt: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
  behavioralSignals?: Record<string, unknown>;
  upgradeIntentSignals?: Record<string, unknown>;
  lastTransition?: LifecycleTransitionMetadata;
  transitionReason?: string;
  transitionTimestamp?: string;
  transitionActor?: string | null;
  lifecycleEvents?: LifecycleTransitionMetadata[];
  orchestrationHooks?: string[];
  transitionMetadata?: Record<string, unknown>;
  audit: {
    version: number;
    actorId: string | null;
    reason: string | null;
    tags: string[];
  };
  metering?: TrialOperationalMeteringState;
  intelligence?: {
    engagementScore?: number;
    conversionSignals?: string[];
    riskFlags?: string[];
  };
};

export type TrialOperationalMeteringState = {
  lastMeteringEventId?: string;
  runtimeCorrelationCount: number;
  replayProtectedEvents: number;
  categoryUsage: Record<string, number>;
  allowanceSignals: { softExhausted: boolean; hardExhausted: boolean };
};

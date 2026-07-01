// Enterprise UX types — shared contracts across onboarding, demo, trust, and guided cognition

export type OnboardingStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";

export type TrustMilestoneLevel =
  | "none"
  | "workspace_created"
  | "first_project"
  | "first_ingestion"
  | "first_insight"
  | "war_room_accessed"
  | "executive_digest_generated";

export type CognitionReadinessLevel =
  | "uninitialized"
  | "workspace_ready"
  | "project_ready"
  | "connector_ready"
  | "ingestion_ready"
  | "operational_ready";

export type DemoDataTag = "SYNTHETIC_DEMO" | "REAL_RUNTIME";

export interface OnboardingStep {
  id: string;
  category: OnboardingStepCategory;
  label: string;
  description: string;
  explanation: string;
  governanceNote: string;
  estimatedImpact: string;
  trustImplication: string;
  status: OnboardingStepStatus;
  order: number;
  skippable: boolean;
}

export type OnboardingStepCategory =
  | "workspace_readiness"
  | "governance_readiness"
  | "project_readiness"
  | "connector_readiness"
  | "ingestion_readiness"
  | "war_room_readiness"
  | "executive_readiness";

export interface OnboardingState {
  workspaceId: string;
  userId: string;
  steps: OnboardingStep[];
  trustMilestone: TrustMilestoneLevel;
  cognitionReadiness: CognitionReadinessLevel;
  completedStepIds: string[];
  skippedStepIds: string[];
  startedAt: string;
  lastProgressAt: string;
  firstValueAchievedAt: string | null;
}

export interface OnboardingProgress {
  totalSteps: number;
  completedSteps: number;
  skippedSteps: number;
  percentComplete: number;
  nextStep: OnboardingStep | null;
  isFirstValueReached: boolean;
  trustMilestone: TrustMilestoneLevel;
  cognitionReadiness: CognitionReadinessLevel;
}

export interface GuidedCognitionConcept {
  id: string;
  term: string;
  plainLanguageExplanation: string;
  whyItMatters: string;
  whatItIsNot: string;
  uncertaintyNote: string;
  governanceBoundary: string | null;
  learnMoreHref: string | null;
}

export interface GuidedCognitionStep {
  id: string;
  order: number;
  title: string;
  narrative: string;
  conceptIds: string[];
  requiredContext: string[];
  completionSignal: string;
}

export interface GuidedCognitionExperience {
  steps: GuidedCognitionStep[];
  concepts: GuidedCognitionConcept[];
  totalSteps: number;
}

export interface EmptyStateGuidance {
  route: string;
  headline: string;
  educationalBody: string;
  valueExplanation: string;
  governanceNote: string | null;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryContext: string | null;
}

export interface FirstValueMilestone {
  id: string;
  label: string;
  description: string;
  achievedAt: string | null;
  isAchieved: boolean;
  requiredForFirstInsight: boolean;
}

export interface FirstValueReadiness {
  milestones: FirstValueMilestone[];
  isFirstInsightReady: boolean;
  firstInsightAchievedAt: string | null;
  firstInsightNarrative: string | null;
  nextMilestoneId: string | null;
  readinessPercent: number;
}

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  dataTag: DemoDataTag;
  category: DemoScenarioCategory;
  narratives: string[];
  topology: DemoTopologyNode[];
  signals: DemoSignal[];
  uncertaintyNote: string;
  lineageNote: string;
  createdAt: string;
}

export type DemoScenarioCategory =
  | "delivery_pressure"
  | "escalation_congestion"
  | "pm_overload"
  | "survivability_degradation"
  | "intervention_stabilization"
  | "connector_federation"
  | "organizational_instability";

export interface DemoTopologyNode {
  id: string;
  label: string;
  type: "project" | "pm" | "stakeholder" | "connector" | "escalation_point";
  pressureLevel: "low" | "medium" | "high" | "critical";
  survivabilityScore: number;
  connections: string[];
  dataTag: DemoDataTag;
}

export interface DemoSignal {
  id: string;
  source: string;
  signalType: string;
  intensity: "low" | "medium" | "high";
  description: string;
  lineage: string;
  uncertainty: string;
  dataTag: DemoDataTag;
  timestamp: string;
}

export interface ExecutiveDemoScenario {
  id: string;
  name: string;
  audience: DemoAudience;
  scenario: DemoScenario;
  narratives: string[];
  walkthroughSteps: DemoWalkthroughStep[];
  governanceSummary: string;
  dataDisclaimer: string;
}

export type DemoAudience =
  | "executive"
  | "pm"
  | "governance"
  | "war_room"
  | "federation";

export interface DemoWalkthroughStep {
  order: number;
  title: string;
  explanation: string;
  whatToShow: string;
  governanceNote: string | null;
  uncertaintyNote: string | null;
}

export interface TrustSignal {
  id: string;
  signalType: TrustSignalType;
  label: string;
  explanation: string;
  sourceLineage: string;
  uncertaintyLevel: "low" | "medium" | "high";
  governanceBoundary: string | null;
  whatPMFreakDoesNotKnow: string;
  generatedAt: string;
}

export type TrustSignalType =
  | "insight_origin"
  | "signal_source"
  | "uncertainty_disclosure"
  | "governance_boundary"
  | "assumption_declaration"
  | "knowledge_gap";

export interface TrustNarrative {
  insightId: string;
  whyGenerated: string;
  signalOrigins: string[];
  uncertaintyStatement: string;
  governanceBoundaries: string[];
  assumptions: string[];
  knowledgeGaps: string[];
}

export interface ConnectorOnboardingState {
  connectorId: ConnectorId;
  name: string;
  readinessStatus: ConnectorReadinessStatus;
  federationValue: string;
  lineageExplanation: string;
  governanceExplanation: string;
  survivabilityEnhancement: string;
  isLiveOAuth: false;
}

export type ConnectorId = "jira" | "slack" | "github" | "calendar";

export type ConnectorReadinessStatus =
  | "not_configured"
  | "simulated_ready"
  | "awaiting_oauth"
  | "connected";

export interface OperationalTourStep {
  id: string;
  order: number;
  concept: string;
  title: string;
  narrative: string;
  whatYouAreSeeingExplanation: string;
  governanceNote: string | null;
  uncertaintyNote: string | null;
  route: string | null;
}

export interface OperationalTour {
  tourId: string;
  name: string;
  steps: OperationalTourStep[];
  estimatedMinutes: number;
}

export interface EnterpriseUXDiagnosticIssue {
  id: string;
  category: DiagnosticCategory;
  severity: "info" | "warning" | "blocking";
  description: string;
  recommendation: string;
  affectedRoute: string | null;
}

export type DiagnosticCategory =
  | "onboarding_blocker"
  | "trust_blocker"
  | "empty_state_confusion"
  | "connector_confusion"
  | "war_room_overload"
  | "cognition_misunderstanding";

export interface EnterpriseUXDiagnosticsReport {
  generatedAt: string;
  issues: EnterpriseUXDiagnosticIssue[];
  warningCount: number;
  blockingCount: number;
  overallReadiness: "not_ready" | "partial" | "ready";
}

export interface EnterpriseUXNarrative {
  id: string;
  context: string;
  narrative: string;
  isHonest: true;
  exposesUncertainty: boolean;
  avoidsFakeConfidence: true;
  generatedAt: string;
}

export interface WorkspaceBootstrapInput {
  workspaceName: string;
  operationalGoals: string[];
  governanceExpectations: string[];
  connectorIntentions: ConnectorId[];
  firstOperationalUseCase: string;
}

export interface ProjectBootstrapInput {
  projectName: string;
  operationalContext: string;
  coordinationConcerns: string[];
  riskAwareness: string[];
}

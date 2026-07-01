// Enterprise UX domain — public surface

// Types
export type {
  CognitionReadinessLevel,
  ConnectorId,
  ConnectorOnboardingState,
  ConnectorReadinessStatus,
  DemoAudience,
  DemoScenario,
  DemoScenarioCategory,
  DemoSignal,
  DemoTopologyNode,
  EmptyStateGuidance,
  EnterpriseUXDiagnosticIssue,
  EnterpriseUXDiagnosticsReport,
  EnterpriseUXNarrative,
  ExecutiveDemoScenario,
  FirstValueMilestone,
  FirstValueReadiness,
  GuidedCognitionConcept,
  GuidedCognitionExperience,
  GuidedCognitionStep,
  OnboardingProgress,
  OnboardingState,
  OnboardingStep,
  OnboardingStepCategory,
  OnboardingStepStatus,
  OperationalTour,
  OperationalTourStep,
  ProjectBootstrapInput,
  TrustMilestoneLevel,
  TrustNarrative,
  TrustSignal,
  TrustSignalType,
  WorkspaceBootstrapInput,
} from "./types/enterprise-ux-types";

// Onboarding
export {
  buildOnboardingFlow,
  completeOnboardingStep,
  evaluateOnboardingProgress,
  retrieveOnboardingState,
  retrieveStepsByCategory,
  skipOnboardingStep,
} from "./onboarding/onboarding-runtime";
export { buildOnboardingChecklist } from "./onboarding/onboarding-checklist";

// Guided cognition
export {
  buildGuidedCognitionExperience,
  retrieveConceptById,
  retrieveGuidedCognitionSteps,
  retrieveOperationalConceptExplanations,
  retrieveStepById,
} from "./guided-experience/guided-cognition-runtime";

// Empty states
export {
  buildFallbackEmptyState,
  retrieveAllEmptyStateRoutes,
  retrieveEmptyStateGuidance,
} from "./empty-states/empty-state-intelligence";

// First value
export {
  evaluateFirstValueReadiness,
  retrieveFirstInsightNarrative,
  retrieveFirstValueMilestones,
} from "./first-value/first-value-runtime";

// Demo runtime
export {
  buildDemoScenario,
  buildDeliveryPressureScenario,
  buildEscalationCongestionScenario,
  retrieveAllDemoScenarioCategories,
} from "./demo-runtime/demo-scenario-builder";
export {
  buildExecutiveDemoScenario,
  retrieveExecutiveDemoNarratives,
  retrieveExecutiveDemoTopology,
} from "./demo-runtime/executive-demo-runtime";

// Trust
export {
  buildTrustNarratives,
  retrieveGovernanceExplanations,
  retrieveTrustSignals,
} from "./trust/trust-building-runtime";

// Workspace & project bootstrap
export {
  buildWorkspaceBootstrapSteps,
  buildWorkspaceBootstrapSummary,
  validateWorkspaceBootstrapInput,
} from "./workspace/workspace-bootstrap-ui";
export {
  buildProjectBootstrapSteps,
  buildProjectFirstValueNarrative,
  validateProjectBootstrapInput,
} from "./projects/project-bootstrap-ui";

// Connector onboarding
export {
  buildConnectorOnboardingReadinessNarrative,
  buildConnectorOnboardingStates,
  retrieveConnectorOnboardingState,
} from "./connectors/connector-onboarding-ui";

// War room
export {
  buildFirstWarRoomExperience,
  retrieveWarRoomExplainers,
  retrieveWarRoomOrientationNarrative,
} from "./war-room/first-war-room-experience";

// Operational tour
export {
  buildOperationalTour,
  retrieveTourNarratives,
  retrieveTourStepById,
  retrieveTourSteps,
} from "./narratives/operational-tour-runtime";

// Narratives
export {
  retrieveEnterpriseUXNarratives,
  retrieveNarrativeByContext,
  retrieveNarrativeById,
} from "./narratives/enterprise-ux-narratives";

// Diagnostics
export {
  buildEnterpriseUXDiagnosticsReport,
  retrieveIssuesByCategory,
} from "./diagnostics/enterprise-ux-diagnostics";

// Manager (unified API surface)
export {
  retrieveEnterpriseUXDiagnostics,
  retrieveEnterpriseUXNarrativesAll,
  retrieveExecutiveDemoState,
  retrieveFirstValueReadiness,
  retrieveGuidedCognition,
  retrieveGovernanceTrustExplanations,
  retrieveOnboardingProgressForWorkspace,
  retrieveOnboardingStateForWorkspace,
  retrieveOperationalTour,
  retrieveTrustSignalsForWorkspace,
} from "./enterprise-ux-manager";

// Hooks
export { useOnboardingRuntime } from "./hooks/use-onboarding-runtime";
export { useGuidedCognition, useOperationalConcepts } from "./hooks/use-guided-cognition";
export { useFirstValueReadiness } from "./hooks/use-first-value-readiness";
export { useExecutiveDemo } from "./hooks/use-executive-demo";
export { useGovernanceExplanations, useTrustSignals } from "./hooks/use-trust-signals";
export { useOperationalTour } from "./hooks/use-operational-tour";

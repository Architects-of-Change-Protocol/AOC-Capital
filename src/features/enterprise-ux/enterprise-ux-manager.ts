import {
  buildEnterpriseUXDiagnosticsReport,
} from "./diagnostics/enterprise-ux-diagnostics";
import {
  buildGuidedCognitionExperience,
} from "./guided-experience/guided-cognition-runtime";
import {
  buildOnboardingFlow,
  evaluateOnboardingProgress,
  retrieveOnboardingState,
} from "./onboarding/onboarding-runtime";
import {
  buildOperationalTour,
} from "./narratives/operational-tour-runtime";
import {
  retrieveEnterpriseUXNarratives,
} from "./narratives/enterprise-ux-narratives";
import {
  evaluateFirstValueReadiness,
} from "./first-value/first-value-runtime";
import {
  buildExecutiveDemoScenario,
} from "./demo-runtime/executive-demo-runtime";
import {
  retrieveTrustSignals,
  retrieveGovernanceExplanations,
} from "./trust/trust-building-runtime";
import type {
  DemoAudience,
  DemoScenarioCategory,
  EnterpriseUXDiagnosticsReport,
  EnterpriseUXNarrative,
  ExecutiveDemoScenario,
  FirstValueReadiness,
  GuidedCognitionExperience,
  OnboardingProgress,
  OnboardingState,
  OperationalTour,
  TrustSignal,
} from "./types/enterprise-ux-types";

export function retrieveOnboardingStateForWorkspace(
  workspaceId: string,
  userId: string,
  completedStepIds?: string[],
  skippedStepIds?: string[]
): OnboardingState {
  return retrieveOnboardingState(workspaceId, userId, {
    completedStepIds: completedStepIds ?? [],
    skippedStepIds: skippedStepIds ?? [],
  });
}

export function retrieveOnboardingProgressForWorkspace(
  workspaceId: string,
  userId: string,
  completedStepIds?: string[],
  skippedStepIds?: string[]
): OnboardingProgress {
  const state = retrieveOnboardingStateForWorkspace(
    workspaceId,
    userId,
    completedStepIds,
    skippedStepIds
  );
  return evaluateOnboardingProgress(state);
}

export function retrieveGuidedCognition(
  completedOnboardingStepIds: string[]
): GuidedCognitionExperience {
  return buildGuidedCognitionExperience(completedOnboardingStepIds);
}

export function retrieveFirstValueReadiness(
  achievedMilestoneIds: string[]
): FirstValueReadiness {
  return evaluateFirstValueReadiness(achievedMilestoneIds);
}

export function retrieveExecutiveDemoState(
  audience: DemoAudience = "executive",
  category: DemoScenarioCategory = "delivery_pressure"
): ExecutiveDemoScenario | null {
  return buildExecutiveDemoScenario(audience, category);
}

export function retrieveTrustSignalsForWorkspace(context: {
  workspaceId: string;
  hasProjects: boolean;
  hasIngestion: boolean;
  hasConnectors: boolean;
}): TrustSignal[] {
  return retrieveTrustSignals(context);
}

export function retrieveGovernanceTrustExplanations(): ReturnType<
  typeof retrieveGovernanceExplanations
> {
  return retrieveGovernanceExplanations();
}

export function retrieveOperationalTour(): OperationalTour {
  return buildOperationalTour();
}

export function retrieveEnterpriseUXDiagnostics(
  onboardingState: OnboardingState | null,
  context: {
    workspaceId: string;
    hasProjects: boolean;
    hasIngestion: boolean;
    hasConnectors: boolean;
    hasWarRoomAccess: boolean;
    hasExecutiveDigest: boolean;
  }
): EnterpriseUXDiagnosticsReport {
  return buildEnterpriseUXDiagnosticsReport(onboardingState, context);
}

export function retrieveEnterpriseUXNarrativesAll(): EnterpriseUXNarrative[] {
  return retrieveEnterpriseUXNarratives();
}

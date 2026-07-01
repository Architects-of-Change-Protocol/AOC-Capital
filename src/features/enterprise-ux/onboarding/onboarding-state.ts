import type {
  CognitionReadinessLevel,
  OnboardingState,
  OnboardingStep,
  TrustMilestoneLevel,
} from "../types/enterprise-ux-types";

export function buildDefaultOnboardingState(
  workspaceId: string,
  userId: string,
  steps: OnboardingStep[]
): OnboardingState {
  return {
    workspaceId,
    userId,
    steps,
    trustMilestone: "none",
    cognitionReadiness: "uninitialized",
    completedStepIds: [],
    skippedStepIds: [],
    startedAt: new Date().toISOString(),
    lastProgressAt: new Date().toISOString(),
    firstValueAchievedAt: null,
  };
}

export function applyStepCompletion(
  state: OnboardingState,
  stepId: string
): OnboardingState {
  const completedStepIds = state.completedStepIds.includes(stepId)
    ? state.completedStepIds
    : [...state.completedStepIds, stepId];

  const trustMilestone = deriveTrustMilestone(completedStepIds, state.steps);
  const cognitionReadiness = deriveCognitionReadiness(
    completedStepIds,
    state.steps
  );

  const firstValueAchievedAt =
    !state.firstValueAchievedAt &&
    cognitionReadiness === "operational_ready"
      ? new Date().toISOString()
      : state.firstValueAchievedAt;

  return {
    ...state,
    completedStepIds,
    trustMilestone,
    cognitionReadiness,
    firstValueAchievedAt,
    lastProgressAt: new Date().toISOString(),
  };
}

export function applyStepSkip(
  state: OnboardingState,
  stepId: string
): OnboardingState {
  const step = state.steps.find((s) => s.id === stepId);
  if (!step?.skippable) return state;

  const skippedStepIds = state.skippedStepIds.includes(stepId)
    ? state.skippedStepIds
    : [...state.skippedStepIds, stepId];

  return {
    ...state,
    skippedStepIds,
    lastProgressAt: new Date().toISOString(),
  };
}

function deriveTrustMilestone(
  completedIds: string[],
  steps: OnboardingStep[]
): TrustMilestoneLevel {
  const completedCategories = new Set(
    steps
      .filter((s) => completedIds.includes(s.id))
      .map((s) => s.category)
  );

  if (completedCategories.has("executive_readiness")) {
    return "executive_digest_generated";
  }
  if (completedCategories.has("war_room_readiness")) {
    return "war_room_accessed";
  }
  if (completedCategories.has("ingestion_readiness")) {
    return "first_ingestion";
  }
  if (completedCategories.has("project_readiness")) {
    return "first_project";
  }
  if (completedCategories.has("workspace_readiness")) {
    return "workspace_created";
  }
  return "none";
}

function deriveCognitionReadiness(
  completedIds: string[],
  steps: OnboardingStep[]
): CognitionReadinessLevel {
  const completedCategories = new Set(
    steps
      .filter((s) => completedIds.includes(s.id))
      .map((s) => s.category)
  );

  if (
    completedCategories.has("ingestion_readiness") &&
    completedCategories.has("project_readiness") &&
    completedCategories.has("connector_readiness")
  ) {
    return "operational_ready";
  }
  if (completedCategories.has("ingestion_readiness")) {
    return "ingestion_ready";
  }
  if (completedCategories.has("connector_readiness")) {
    return "connector_ready";
  }
  if (completedCategories.has("project_readiness")) {
    return "project_ready";
  }
  if (completedCategories.has("workspace_readiness")) {
    return "workspace_ready";
  }
  return "uninitialized";
}

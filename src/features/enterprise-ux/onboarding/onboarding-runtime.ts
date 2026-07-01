import type {
  OnboardingProgress,
  OnboardingState,
  OnboardingStep,
} from "../types/enterprise-ux-types";
import { buildOnboardingChecklist } from "./onboarding-checklist";
import {
  applyStepCompletion,
  applyStepSkip,
  buildDefaultOnboardingState,
} from "./onboarding-state";

export function buildOnboardingFlow(
  workspaceId: string,
  userId: string
): OnboardingState {
  const steps = buildOnboardingChecklist();
  return buildDefaultOnboardingState(workspaceId, userId, steps);
}

export function retrieveOnboardingState(
  workspaceId: string,
  userId: string,
  partialOverrides?: Partial<Pick<OnboardingState, "completedStepIds" | "skippedStepIds">>
): OnboardingState {
  const base = buildOnboardingFlow(workspaceId, userId);

  let state = base;
  for (const id of partialOverrides?.completedStepIds ?? []) {
    state = applyStepCompletion(state, id);
  }
  for (const id of partialOverrides?.skippedStepIds ?? []) {
    state = applyStepSkip(state, id);
  }

  return state;
}

export function evaluateOnboardingProgress(
  state: OnboardingState
): OnboardingProgress {
  const completableSteps = state.steps.filter((s) => !s.skippable || !state.skippedStepIds.includes(s.id));
  const completed = state.completedStepIds.length;
  const skipped = state.skippedStepIds.length;
  const total = state.steps.length;

  const percentComplete =
    total === 0
      ? 0
      : Math.round(((completed + skipped) / total) * 100);

  const nextStep =
    state.steps
      .filter(
        (s) =>
          !state.completedStepIds.includes(s.id) &&
          !state.skippedStepIds.includes(s.id)
      )
      .sort((a, b) => a.order - b.order)[0] ?? null;

  const isFirstValueReached =
    state.firstValueAchievedAt !== null ||
    state.cognitionReadiness === "operational_ready";

  return {
    totalSteps: total,
    completedSteps: completed,
    skippedSteps: skipped,
    percentComplete,
    nextStep,
    isFirstValueReached,
    trustMilestone: state.trustMilestone,
    cognitionReadiness: state.cognitionReadiness,
  };
}

export function completeOnboardingStep(
  state: OnboardingState,
  stepId: string
): OnboardingState {
  return applyStepCompletion(state, stepId);
}

export function skipOnboardingStep(
  state: OnboardingState,
  stepId: string
): OnboardingState {
  return applyStepSkip(state, stepId);
}

export function retrieveStepsByCategory(
  state: OnboardingState,
  category: OnboardingStep["category"]
): OnboardingStep[] {
  return state.steps
    .filter((s) => s.category === category)
    .sort((a, b) => a.order - b.order);
}

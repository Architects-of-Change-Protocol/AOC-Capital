"use client";

import { useCallback, useMemo, useState } from "react";
import {
  buildOnboardingFlow,
  completeOnboardingStep,
  evaluateOnboardingProgress,
  skipOnboardingStep,
} from "../onboarding/onboarding-runtime";
import type { OnboardingProgress, OnboardingState } from "../types/enterprise-ux-types";

export function useOnboardingRuntime(workspaceId: string, userId: string) {
  const [state, setState] = useState<OnboardingState>(() =>
    buildOnboardingFlow(workspaceId, userId)
  );

  const progress: OnboardingProgress = useMemo(
    () => evaluateOnboardingProgress(state),
    [state]
  );

  const completeStep = useCallback((stepId: string) => {
    setState((prev: OnboardingState) => completeOnboardingStep(prev, stepId));
  }, []);

  const skipStep = useCallback((stepId: string) => {
    setState((prev: OnboardingState) => skipOnboardingStep(prev, stepId));
  }, []);

  return { state, progress, completeStep, skipStep };
}

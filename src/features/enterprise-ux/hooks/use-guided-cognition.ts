"use client";

import { useMemo } from "react";
import {
  buildGuidedCognitionExperience,
  retrieveOperationalConceptExplanations,
} from "../guided-experience/guided-cognition-runtime";
import type { GuidedCognitionExperience } from "../types/enterprise-ux-types";

export function useGuidedCognition(
  completedOnboardingStepIds: string[]
): GuidedCognitionExperience {
  return useMemo(
    () => buildGuidedCognitionExperience(completedOnboardingStepIds),
    [completedOnboardingStepIds]
  );
}

export function useOperationalConcepts() {
  return useMemo(() => retrieveOperationalConceptExplanations(), []);
}

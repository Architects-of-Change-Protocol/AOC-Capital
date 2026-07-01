import type {
  GuidedCognitionConcept,
  GuidedCognitionExperience,
  GuidedCognitionStep,
} from "../types/enterprise-ux-types";
import {
  buildGuidedCognitionConceptLibrary,
  buildGuidedCognitionSteps,
} from "./guided-cognition-steps";

export function buildGuidedCognitionExperience(
  completedOnboardingStepIds: string[]
): GuidedCognitionExperience {
  const allSteps = buildGuidedCognitionSteps();
  const concepts = buildGuidedCognitionConceptLibrary();

  const availableSteps = allSteps.filter((step) =>
    step.requiredContext.every((req) => completedOnboardingStepIds.includes(req))
  );

  return {
    steps: availableSteps,
    concepts,
    totalSteps: allSteps.length,
  };
}

export function retrieveGuidedCognitionSteps(
  completedOnboardingStepIds: string[]
): GuidedCognitionStep[] {
  return buildGuidedCognitionExperience(completedOnboardingStepIds).steps;
}

export function retrieveOperationalConceptExplanations(): GuidedCognitionConcept[] {
  return buildGuidedCognitionConceptLibrary();
}

export function retrieveConceptById(
  conceptId: string
): GuidedCognitionConcept | null {
  return buildGuidedCognitionConceptLibrary().find((c) => c.id === conceptId) ?? null;
}

export function retrieveStepById(
  stepId: string
): GuidedCognitionStep | null {
  return buildGuidedCognitionSteps().find((s) => s.id === stepId) ?? null;
}

"use client";

import { useCallback, useMemo, useState } from "react";
import { buildOperationalTour } from "../narratives/operational-tour-runtime";
import type { OperationalTour, OperationalTourStep } from "../types/enterprise-ux-types";

export function useOperationalTour(): {
  tour: OperationalTour;
  currentStep: OperationalTourStep | null;
  currentStepIndex: number;
  totalSteps: number;
  advance: () => void;
  goBack: () => void;
  isComplete: boolean;
} {
  const tour = useMemo(() => buildOperationalTour(), []);
  const [stepIndex, setStepIndex] = useState(0);

  const advance = useCallback(() => {
    setStepIndex((i: number) => Math.min(i + 1, tour.steps.length - 1));
  }, [tour.steps.length]);

  const goBack = useCallback(() => {
    setStepIndex((i: number) => Math.max(i - 1, 0));
  }, []);

  const isComplete = stepIndex >= tour.steps.length - 1;
  const currentStep = tour.steps[stepIndex] ?? null;

  return {
    tour,
    currentStep,
    currentStepIndex: stepIndex,
    totalSteps: tour.steps.length,
    advance,
    goBack,
    isComplete,
  };
}

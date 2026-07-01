"use client";

import { useMemo } from "react";
import { evaluateFirstValueReadiness } from "../first-value/first-value-runtime";
import type { FirstValueReadiness } from "../types/enterprise-ux-types";

export function useFirstValueReadiness(
  achievedMilestoneIds: string[]
): FirstValueReadiness {
  return useMemo(
    () => evaluateFirstValueReadiness(achievedMilestoneIds),
    [achievedMilestoneIds]
  );
}

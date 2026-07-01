"use client";

import { useMemo } from "react";
import {
  retrieveGovernanceExplanations,
  retrieveTrustSignals,
} from "../trust/trust-building-runtime";
import type { TrustSignal } from "../types/enterprise-ux-types";

export function useTrustSignals(context: {
  workspaceId: string;
  hasProjects: boolean;
  hasIngestion: boolean;
  hasConnectors: boolean;
}): TrustSignal[] {
  return useMemo(
    () => retrieveTrustSignals(context),
    [context.workspaceId, context.hasProjects, context.hasIngestion, context.hasConnectors]
  );
}

export function useGovernanceExplanations() {
  return useMemo(() => retrieveGovernanceExplanations(), []);
}

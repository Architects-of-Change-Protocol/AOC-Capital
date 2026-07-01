export type ValidationConfidence = "low" | "building" | "credible" | "high";

export type RuntimeSignalSource =
  | "conversation"
  | "memory"
  | "awakening"
  | "imprint"
  | "navigation"
  | "delivery"
  | "stakeholders"
  | "risk";

import type { SupportedLanguage } from "./language/language-detection";
import type { OperationalConcept } from "./language/operational-concepts";

export type ValidationTrace = {
  traceId: string;
  timestamp: number;
  confidence: ValidationConfidence;
  activeSources: RuntimeSignalSource[];
  reasoningPath: string[];
  continuitySignals: string[];
  triggerSummary?: string;
  outputBias?: string;
  feedbackState?: "aligned" | "needs-recalibration";
  language?: SupportedLanguage;
  operationalConcepts?: OperationalConcept[];
  matchedAliases?: string[];
};

export type ValidationFeedback = "aligned" | "needs-recalibration";

export type ValidationState = {
  traces: ValidationTrace[];
  currentConfidence: ValidationConfidence;
  feedbackBias: number;
};

const STORAGE_KEY_PREFIX = "pmfreak.validation";
const MAX_TRACES = 25;

function buildStorageKey(companyId: string, workspaceId: string, userId: string): string {
  return `${STORAGE_KEY_PREFIX}.${companyId}.${workspaceId}.${userId}`;
}

export function emptyValidationState(): ValidationState {
  return { traces: [], currentConfidence: "low", feedbackBias: 0 };
}

export function loadValidationState(
  companyId: string,
  workspaceId: string,
  userId: string,
): ValidationState {
  if (typeof window === "undefined") return emptyValidationState();
  try {
    const raw = window.localStorage.getItem(buildStorageKey(companyId, workspaceId, userId));
    if (!raw) return emptyValidationState();
    return JSON.parse(raw) as ValidationState;
  } catch {
    return emptyValidationState();
  }
}

export function persistValidationState(
  companyId: string,
  workspaceId: string,
  userId: string,
  state: ValidationState,
): void {
  if (typeof window === "undefined") return;
  try {
    const bounded: ValidationState = { ...state, traces: state.traces.slice(-MAX_TRACES) };
    window.localStorage.setItem(buildStorageKey(companyId, workspaceId, userId), JSON.stringify(bounded));
  } catch {
    // localStorage unavailable
  }
}

export function addTrace(state: ValidationState, trace: ValidationTrace): ValidationState {
  const traces = [...state.traces, trace].slice(-MAX_TRACES);
  return { ...state, traces, currentConfidence: trace.confidence };
}

export function applyFeedback(
  state: ValidationState,
  feedback: ValidationFeedback,
  traceId: string,
): ValidationState {
  const delta = feedback === "aligned" ? 0.15 : -0.2;
  const newBias = Math.max(-1, Math.min(1, state.feedbackBias + delta));
  const updatedTraces = state.traces.map((t) =>
    t.traceId === traceId ? { ...t, feedbackState: feedback } : t,
  );
  return { ...state, traces: updatedTraces, feedbackBias: newBias };
}

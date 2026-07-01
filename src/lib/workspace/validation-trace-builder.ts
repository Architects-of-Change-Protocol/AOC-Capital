import type { AwakeningState } from "./awakening-state";
import type { ImprintConfidence } from "./imprint-confidence";
import type { PMImprintState } from "./operational-imprint-profile";
import type { RuntimeSignalSource, ValidationConfidence, ValidationTrace } from "./runtime-validation";
import type { SupportedLanguage } from "./language/language-detection";
import type { OperationalConcept } from "./language/operational-concepts";

let traceCounter = 0;

function nextTraceId(): string {
  traceCounter += 1;
  return `trace-${Date.now()}-${traceCounter}`;
}

function awakeningScore(awakening: AwakeningState): number {
  const map: Record<AwakeningState["stage"], number> = {
    dormant: 0,
    initializing: 1,
    orienting: 2,
    engaged: 3,
    expanded: 4,
    "fully-operational": 5,
  };
  return map[awakening.stage];
}

function imprintScore(confidence: ImprintConfidence): number {
  const map: Record<ImprintConfidence, number> = {
    forming: 0,
    emerging: 1,
    stable: 2,
    deep: 3,
  };
  return map[confidence];
}

export function buildValidationTrace(
  awakening: AwakeningState,
  imprintState: PMImprintState,
  imprintConfidence: ImprintConfidence,
  feedbackBias: number = 0,
  contradictionDetected: boolean = false,
  triggerSummary?: string,
  language?: SupportedLanguage,
  operationalConcepts?: OperationalConcept[],
  matchedAliases?: string[],
): ValidationTrace {
  const base = awakeningScore(awakening) + imprintScore(imprintConfidence);
  const adjusted = base + feedbackBias * 2 - (contradictionDetected ? 2 : 0);

  let confidence: ValidationConfidence;
  if (adjusted >= 7) confidence = "high";
  else if (adjusted >= 5) confidence = "credible";
  else if (adjusted >= 2) confidence = "building";
  else confidence = "low";

  const activeSources: RuntimeSignalSource[] = [];
  if (awakening.interactionCount > 0) activeSources.push("conversation");
  if (awakening.awakenedAgents.includes("memory")) activeSources.push("memory");
  if (awakening.stage !== "dormant") activeSources.push("awakening");
  if (imprintConfidence !== "forming") activeSources.push("imprint");
  if (awakening.awakenedAgents.includes("delivery")) activeSources.push("delivery");
  if (awakening.awakenedAgents.includes("stakeholders")) activeSources.push("stakeholders");
  if (awakening.awakenedAgents.includes("risk")) activeSources.push("risk");

  const AGENT_LABELS: Record<string, string> = {
    context: "Context orientation",
    memory: "Memory continuity",
    delivery: "Delivery signal weighting",
    stakeholders: "Stakeholder inference",
    risk: "Risk assessment",
    executive: "Executive synthesis",
    portfolio: "Portfolio calibration",
  };
  const reasoningPath = awakening.awakenedAgents.flatMap((a) => (AGENT_LABELS[a] ? [AGENT_LABELS[a]] : []));

  const continuitySignals: string[] = [];
  if (imprintConfidence !== "forming") {
    continuitySignals.push(`${imprintState.profile.dominantFocus}-first PM pattern observed`);
    continuitySignals.push(`${imprintState.profile.interventionStyle} intervention style recognized`);
    continuitySignals.push(`${imprintState.profile.observedInteractionCount} prior consistent interaction signals`);
  }
  if (contradictionDetected) {
    continuitySignals.push("Pattern divergence detected — confidence temporarily reduced");
  }

  const OUTPUT_BIAS: Record<string, string> = {
    delivery: "Execution-oriented clarification",
    stakeholders: "Stakeholder-aligned framing",
    governance: "Governance-aware structuring",
    risk: "Risk-weighted prioritization",
  };

  return {
    traceId: nextTraceId(),
    timestamp: Date.now(),
    confidence,
    activeSources,
    reasoningPath,
    continuitySignals,
    triggerSummary: triggerSummary ?? "Operational signal processed",
    outputBias: OUTPUT_BIAS[imprintState.profile.dominantFocus] ?? "Balanced operational guidance",
    language,
    operationalConcepts,
    matchedAliases,
  };
}

export const VALIDATION_CONFIDENCE_LABELS: Record<ValidationConfidence, string> = {
  low: "Confidence building",
  building: "Confidence building",
  credible: "Runtime credible",
  high: "Operationally validated",
};

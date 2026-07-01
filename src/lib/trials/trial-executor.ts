import { deriveAwakeningState } from "@/lib/workspace/awakening-state";
import { computeImprintConfidence } from "@/lib/workspace/imprint-confidence";
import { detectOperationalLanguage } from "@/lib/workspace/language/language-detection";
import { normalizeOperationalConcepts } from "@/lib/workspace/language/operational-concepts";
import { emptyImprintState } from "@/lib/workspace/operational-imprint-profile";
import { buildValidationTrace } from "@/lib/workspace/validation-trace-builder";
import { detectContradiction } from "@/lib/workspace/validation-consistency";
import type { TrialScenario } from "@/lib/trials/trial-model";

export type TrialExecutionResult = {
  scenario: TrialScenario;
  pmfreakResponse: string;
  runtimeConfidence: string;
  traceSummary: string[];
  normalizedConcepts: string[];
  language: "en" | "es";
  imprintContext: string;
  contradiction: "clear" | "contradiction-detected";
};

export async function executeTrialScenario(scenario: TrialScenario): Promise<TrialExecutionResult> {
  const languageDetection = detectOperationalLanguage(scenario.prompt);
  const normalizedConcepts = normalizeOperationalConcepts(scenario.prompt);
  const imprint = emptyImprintState();
  const contradictionResult = detectContradiction(scenario.prompt, imprint);
  const awakening = deriveAwakeningState(4);
  const confidence = computeImprintConfidence(imprint.profile);

  const pmfreakResponse = `Start by naming accountable owners, deadline windows, and escalation path for ${scenario.category.replaceAll("_", " ")} before intervention noise spreads.`;
  const trace = buildValidationTrace(
    awakening,
    imprint,
    confidence,
    0,
    contradictionResult.hasContradiction,
    `trial:${scenario.category}`,
    languageDetection.language,
    normalizedConcepts.concepts,
    [],
  );

  return {
    scenario,
    pmfreakResponse,
    runtimeConfidence: trace.confidence,
    traceSummary: trace.reasoningPath,
    normalizedConcepts: normalizedConcepts.concepts,
    language: languageDetection.language,
    imprintContext: imprint.profile.dominantFocus,
    contradiction: contradictionResult.hasContradiction ? "contradiction-detected" : "clear",
  };
}

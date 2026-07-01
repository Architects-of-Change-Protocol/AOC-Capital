import type { SupportedLanguage } from "./language-detection";
import type { OperationalConcept } from "./operational-concepts";
import { getLocalizedConceptLabel } from "./localized-labels";

export function buildLocalizedFirstContactFrame(input: {
  language: SupportedLanguage;
  concepts: OperationalConcept[];
}): {
  acknowledgment: string;
  orientation: string;
  clarifyingQuestion: string;
} {
  const leadConcept = input.concepts[0];
  const conceptLabel = leadConcept ? getLocalizedConceptLabel(leadConcept, input.language) : undefined;

  if (input.language === "es") {
    return {
      acknowledgment: "Contexto operativo detectado.",
      orientation: conceptLabel
        ? `Estoy viendo una posible señal en: ${conceptLabel}.`
        : "Estoy viendo una posible dependencia operativa.",
      clarifyingQuestion: "¿Qué está bloqueando primero la ejecución: accesos, aprobación o alineación de responsables?",
    };
  }

  return {
    acknowledgment: "Operational context detected.",
    orientation: conceptLabel
      ? `I am seeing a possible signal in: ${conceptLabel}.`
      : "I am seeing a possible client-side dependency.",
    clarifyingQuestion: "What is constraining execution first: access, approval, or owner alignment?",
  };
}

export function getLocalizedIgnitionCues(language: SupportedLanguage): string[] {
  if (language === "es") {
    return [
      "Una dependencia está bloqueando la ejecución",
      "Está surgiendo un problema de alineación con stakeholders",
      "Necesito aclarar el alcance del proyecto",
    ];
  }

  return [
    "A delivery dependency is blocking execution",
    "A stakeholder alignment issue is emerging",
    "I need help clarifying project scope",
  ];
}

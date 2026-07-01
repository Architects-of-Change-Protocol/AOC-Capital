import type { OperationalConcept } from "./operational-concepts";
import type { SupportedLanguage } from "./language-detection";

export const LOCALIZED_CONCEPT_LABELS: Record<OperationalConcept, Record<SupportedLanguage, string>> = {
  client_dependency_blockage: { en: "Client-side dependency blockage", es: "Bloqueo de dependencia del cliente" },
  vendor_delivery_delay: { en: "Vendor delivery delay", es: "Atraso de entrega del proveedor" },
  financial_approval_hold: { en: "Financial approval hold", es: "Bloqueo de aprobación financiera" },
  technical_access_constraint: { en: "Technical access constraint", es: "Restricción de acceso técnico" },
  scope_ambiguity: { en: "Scope ambiguity", es: "Ambigüedad de alcance" },
  timeline_compression: { en: "Timeline compression", es: "Compresión del cronograma" },
  stakeholder_alignment_drift: { en: "Stakeholder alignment drift", es: "Deriva de alineación de stakeholders" },
  executive_escalation_pressure: { en: "Executive escalation pressure", es: "Presión de escalamiento ejecutivo" },
  governance_approval_friction: { en: "Governance approval friction", es: "Fricción de aprobación de gobernanza" },
  risk_visibility_gap: { en: "Risk visibility gap", es: "Brecha de visibilidad de riesgos" },
};

export const LOCALIZED_MICROCOPY = {
  awakeningStates: { en: "Operational awakening", es: "Activación operativa" },
  imprintConfidence: { en: "Imprint confidence", es: "Confianza de impronta" },
  validationConfidence: { en: "Validation confidence", es: "Confianza de validación" },
  firstContactPrompt: { en: "Operational context detected.", es: "Contexto operativo detectado." },
  trustPanel: { en: "Trust panel", es: "Panel de confianza" },
};

export function getLocalizedConceptLabel(concept: OperationalConcept, language: SupportedLanguage): string {
  return LOCALIZED_CONCEPT_LABELS[concept][language];
}

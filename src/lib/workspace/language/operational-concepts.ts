export type OperationalConcept =
  | "client_dependency_blockage"
  | "vendor_delivery_delay"
  | "financial_approval_hold"
  | "technical_access_constraint"
  | "scope_ambiguity"
  | "timeline_compression"
  | "stakeholder_alignment_drift"
  | "executive_escalation_pressure"
  | "governance_approval_friction"
  | "risk_visibility_gap";

const CONCEPT_ALIASES: Record<OperationalConcept, { en: string[]; es: string[] }> = {
  client_dependency_blockage: {
    en: ["client dependency", "client blocker", "client has not provided", "customer dependency"],
    es: ["dependencia del cliente", "cliente no entrega", "bloqueo del cliente", "cliente no ha entregado"],
  },
  vendor_delivery_delay: { en: ["vendor delayed", "vendor delay", "supplier delay"], es: ["proveedor atrasado", "atraso del proveedor", "el proveedor se atrasó"] },
  financial_approval_hold: { en: ["financial approval", "budget approval hold", "po pending", "purchase order pending"], es: ["aprobación financiera", "aprobación de presupuesto", "oc pendiente", "orden de compra pendiente"] },
  technical_access_constraint: { en: ["access blocked", "missing access", "credential blockage"], es: ["acceso bloqueado", "faltan accesos", "sin credenciales"] },
  scope_ambiguity: { en: ["scope unclear", "scope ambiguity", "unclear requirements"], es: ["alcance ambiguo", "alcance no claro", "requisitos poco claros"] },
  timeline_compression: { en: ["compressed timeline", "timeline compression", "deadline pulled in"], es: ["cronograma comprimido", "compresión de tiempo", "fecha adelantada"] },
  stakeholder_alignment_drift: { en: ["stakeholder misalignment", "alignment drift", "owner misalignment"], es: ["desalineación de stakeholders", "deriva de alineación", "responsables desalineados"] },
  executive_escalation_pressure: { en: ["executive escalation", "sponsor pressure", "escalation pressure"], es: ["escalamiento ejecutivo", "presión del sponsor", "presión de escalamiento"] },
  governance_approval_friction: { en: ["governance approval", "approval friction", "change board blocked"], es: ["fricción de aprobación", "aprobación de gobierno", "comité de cambios bloqueado"] },
  risk_visibility_gap: { en: ["risk visibility gap", "unknown risk", "risk not visible"], es: ["brecha de visibilidad de riesgo", "riesgo no visible", "riesgo desconocido"] },
};

export function normalizeOperationalConcepts(input: string): {
  concepts: OperationalConcept[];
  matchedAliases: string[];
} {
  const normalized = input.toLowerCase();
  const concepts: OperationalConcept[] = [];
  const matchedAliases: string[] = [];

  for (const [concept, aliases] of Object.entries(CONCEPT_ALIASES) as [OperationalConcept, { en: string[]; es: string[] }][]) {
    const allAliases = [...aliases.en, ...aliases.es];
    const matches = allAliases.filter((alias) => normalized.includes(alias.toLowerCase()));
    if (matches.length > 0) {
      concepts.push(concept);
      matchedAliases.push(...matches);
    }
  }

  return { concepts, matchedAliases };
}

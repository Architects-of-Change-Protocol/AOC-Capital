import type { TrialScenario } from "@/lib/trials/trial-model";

const now = Date.now();

export const TRIAL_SCENARIOS: TrialScenario[] = [
  { id: "trial-001", title: "Client access blockage", category: "dependency_blockage", source: "manual", language: "es", prompt: "El cliente no ha entregado accesos y las licencias ya están corriendo. Necesito escalar sin generar fricción.", createdAt: now },
  { id: "trial-002", title: "Vendor shipment delay", category: "vendor_delay", source: "manual", language: "en", prompt: "The vendor shipment is delayed and implementation dates are approaching. What intervention should happen first?", createdAt: now },
  { id: "trial-003", title: "Financial approval hold", category: "financial_constraint", source: "manual", language: "es", prompt: "La aprobación financiera sigue pendiente y esto está afectando la ventana operativa.", createdAt: now },
  { id: "trial-004", title: "Stakeholder alignment drift", category: "stakeholder_alignment", source: "manual", language: "en", prompt: "Technical and executive stakeholders are misaligned on delivery expectations.", createdAt: now },
  { id: "trial-005", title: "Unclear scope boundaries", category: "scope_ambiguity", source: "historical", language: "en", prompt: "Multiple teams are interpreting scope differently and rework is increasing.", createdAt: now },
  { id: "trial-006", title: "Escalation from sponsor", category: "escalation_pressure", source: "historical", language: "es", prompt: "El sponsor pidió escalar hoy mismo por falta de avances visibles.", createdAt: now },
  { id: "trial-007", title: "Governance checkpoint miss", category: "governance_friction", source: "manual", language: "en", prompt: "Steering committee governance artifacts are incomplete right before stage-gate review.", createdAt: now },
  { id: "trial-008", title: "Recovery plan after slippage", category: "execution_recovery", source: "historical", language: "es", prompt: "Se perdieron dos hitos seguidos y necesito un plan de recuperación realista.", createdAt: now },
  { id: "trial-009", title: "Dependency owner silent", category: "dependency_blockage", source: "live-project", language: "en", prompt: "A critical dependency owner has gone silent for five days and the integration window is shrinking.", createdAt: now },
  { id: "trial-010", title: "Partner API delay", category: "vendor_delay", source: "live-project", language: "es", prompt: "El proveedor del API movió su fecha otra vez y el equipo está perdiendo confianza.", createdAt: now },
  { id: "trial-011", title: "Budget freeze shock", category: "financial_constraint", source: "historical", language: "en", prompt: "A temporary budget freeze was announced while two workstreams require immediate commitments.", createdAt: now },
  { id: "trial-012", title: "Conflicting leadership direction", category: "stakeholder_alignment", source: "manual", language: "es", prompt: "Dirección técnica y dirección ejecutiva están dando instrucciones distintas al equipo.", createdAt: now },
  { id: "trial-013", title: "Definition of done conflict", category: "scope_ambiguity", source: "manual", language: "es", prompt: "No hay acuerdo claro sobre qué significa completar el entregable principal.", createdAt: now },
  { id: "trial-014", title: "Escalation overload", category: "escalation_pressure", source: "live-project", language: "en", prompt: "Escalations are increasing daily and team bandwidth is being consumed by urgent requests.", createdAt: now },
  { id: "trial-015", title: "Governance approval friction", category: "governance_friction", source: "manual", language: "es", prompt: "El comité pide más evidencia de trazabilidad y eso está retrasando decisiones críticas.", createdAt: now },
  { id: "trial-016", title: "Execution rebound planning", category: "execution_recovery", source: "manual", language: "en", prompt: "After a failed release, what is the first operational move to restore delivery confidence?", createdAt: now },
  { id: "trial-017", title: "Cross-team handoff failure", category: "dependency_blockage", source: "historical", language: "en", prompt: "A handoff between engineering and operations keeps failing due to unclear ownership.", createdAt: now },
  { id: "trial-018", title: "Procurement cycle risk", category: "vendor_delay", source: "historical", language: "es", prompt: "Compras no confirma órdenes y la fecha de implementación está comprometida.", createdAt: now },
  { id: "trial-019", title: "Cost cap constraint", category: "financial_constraint", source: "live-project", language: "en", prompt: "Finance imposed a cost cap that blocks planned staffing for the next sprint cycle.", createdAt: now },
  { id: "trial-020", title: "Recovery with executive pressure", category: "execution_recovery", source: "live-project", language: "es", prompt: "Necesitamos recuperar ejecución mientras la dirección exige resultados esta semana.", createdAt: now },
];

export const getTrialScenarios = () => TRIAL_SCENARIOS;

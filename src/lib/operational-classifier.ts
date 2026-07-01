import type { OperationalDomain } from "@/lib/operational-memory";

export type InputHubMode =
  | "quick_update"
  | "stakeholder_signal"
  | "meeting_intelligence"
  | "delivery_signal"
  | "governance_concern"
  | "team_health_signal"
  | "attachment";

export type OperationalSignalType =
  | "stakeholder_pressure"
  | "escalation_sensitivity"
  | "governance_drift"
  | "delivery_dependency_risk"
  | "delivery_confidence_shift"
  | "pm_fatigue_progression"
  | "coordination_breakdown"
  | "unresolved_decision_risk"
  | "executive_visibility_pressure"
  | "general_operational_change";

export type ClassifiedInput = {
  domains: OperationalDomain[];
  signalTypes: OperationalSignalType[];
  confidence: number;
  rationale: string[];
};

const DOMAIN_KEYWORDS: Array<{ domain: OperationalDomain; keywords: RegExp[] }> = [
  { domain: "stakeholder_intelligence", keywords: [/stakeholder/i, /alignment/i, /confidence/i, /patience/i, /sponsor/i, /adrian/i] },
  { domain: "delivery_intelligence", keywords: [/blocker/i, /milestone/i, /dependency/i, /uat/i, /delivery/i, /timeline/i] },
  { domain: "pmo_governance", keywords: [/approval/i, /ownership/i, /compliance/i, /reporting/i, /governance/i] },
  { domain: "team_health", keywords: [/fatigue/i, /burnout/i, /weekend/i, /overload/i, /friction/i, /coordination/i] },
  { domain: "executive_context", keywords: [/executive/i, /escalation/i, /visibility/i, /summary/i, /political/i] },
  { domain: "risk_intelligence", keywords: [/risk/i, /pressure/i, /sensitive/i, /drift/i] },
  { domain: "operational_memory", keywords: [/decision/i, /observation/i, /update/i, /meeting/i] },
];

const MODE_DEFAULT_DOMAINS: Record<InputHubMode, OperationalDomain[]> = {
  quick_update: ["operational_memory", "risk_intelligence"],
  stakeholder_signal: ["stakeholder_intelligence", "executive_context"],
  meeting_intelligence: ["operational_memory", "delivery_intelligence"],
  delivery_signal: ["delivery_intelligence", "risk_intelligence"],
  governance_concern: ["pmo_governance", "delivery_intelligence"],
  team_health_signal: ["team_health", "risk_intelligence"],
  attachment: ["operational_memory"],
};

export function classifyOperationalInput(mode: InputHubMode, text: string): ClassifiedInput {
  const normalized = text.trim();
  const matchedDomains = new Set<OperationalDomain>(MODE_DEFAULT_DOMAINS[mode]);
  const rationale: string[] = [];

  for (const { domain, keywords } of DOMAIN_KEYWORDS) {
    if (keywords.some((pattern) => pattern.test(normalized))) {
      matchedDomains.add(domain);
      rationale.push(`Matched ${domain} from lexical pattern`);
    }
  }

  const signalTypes: OperationalSignalType[] = [];
  const lowered = normalized.toLowerCase();
  if (/(losing patience|pressure|demand|escalat)/i.test(lowered)) signalTypes.push("stakeholder_pressure", "escalation_sensitivity");
  if (/(approval|ownership|reporting|compliance|governance)/i.test(lowered)) signalTypes.push("governance_drift");
  if (/(dependency|blocker|uat|milestone)/i.test(lowered)) signalTypes.push("delivery_dependency_risk");
  if (/(confidence|slip|delay|late)/i.test(lowered)) signalTypes.push("delivery_confidence_shift");
  if (/(weekend|fatigue|burnout|overload)/i.test(lowered)) signalTypes.push("pm_fatigue_progression");
  if (/(friction|breakdown|misalign)/i.test(lowered)) signalTypes.push("coordination_breakdown");
  if (/(unresolved|pending decision|still unclear)/i.test(lowered)) signalTypes.push("unresolved_decision_risk");
  if (/(executive|summary every|visibility)/i.test(lowered)) signalTypes.push("executive_visibility_pressure");
  if (!signalTypes.length) signalTypes.push("general_operational_change");

  const uniqueSignals = [...new Set(signalTypes)];
  const confidence = Math.min(95, 55 + rationale.length * 7 + uniqueSignals.length * 4);

  return {
    domains: [...matchedDomains],
    signalTypes: uniqueSignals,
    confidence,
    rationale,
  };
}

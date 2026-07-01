import type { EnterpriseUXNarrative } from "../types/enterprise-ux-types";

const NARRATIVE_REGISTRY: Omit<EnterpriseUXNarrative, "generatedAt">[] = [
  {
    id: "narrative-survivability-depth",
    context: "low_signal_depth",
    narrative:
      "Operational survivability insights become more meaningful after project coordination signals are ingested. PMFreak currently has limited operational confidence because only partial ingestion signals are available.",
    isHonest: true,
    exposesUncertainty: true,
    avoidsFakeConfidence: true,
  },
  {
    id: "narrative-federation-value",
    context: "connector_onboarding",
    narrative:
      "Governance-safe federation preserves source lineage while correlating operational pressure across systems. When Jira, Slack, and Calendar signals are federated, PMFreak can surface cross-system coordination patterns that are invisible in any single tool.",
    isHonest: true,
    exposesUncertainty: true,
    avoidsFakeConfidence: true,
  },
  {
    id: "narrative-partial-confidence",
    context: "first_ingestion",
    narrative:
      "PMFreak currently has limited operational confidence because only partial ingestion signals are available. Survivability scores, propagation paths, and operational narratives will increase in accuracy as more signals are ingested.",
    isHonest: true,
    exposesUncertainty: true,
    avoidsFakeConfidence: true,
  },
  {
    id: "narrative-lineage-trust",
    context: "trust_building",
    narrative:
      "Every operational insight PMFreak generates is traceable to the signals that informed it. Source lineage is preserved from ingestion through synthesis. If an insight appears incorrect, reviewing its source signals will reveal whether the error originated in the ingestion or the inference.",
    isHonest: true,
    exposesUncertainty: false,
    avoidsFakeConfidence: true,
  },
  {
    id: "narrative-bounded-certainty",
    context: "executive_communication",
    narrative:
      "PMFreak's operational summaries use bounded-certainty language because operational intelligence is probabilistic, not deterministic. High-confidence observations are supported by multiple corroborating signals. Low-confidence observations are flagged as such and should not inform high-stakes decisions without additional validation.",
    isHonest: true,
    exposesUncertainty: true,
    avoidsFakeConfidence: true,
  },
  {
    id: "narrative-governance-design",
    context: "governance_explanation",
    narrative:
      "PMFreak is designed to support human decision-making, not replace it. Governance boundaries ensure that automated coordination recommendations remain within the authority bounds your organization has defined. No intervention executes without human authorization.",
    isHonest: true,
    exposesUncertainty: false,
    avoidsFakeConfidence: true,
  },
  {
    id: "narrative-war-room-intention",
    context: "war_room_orientation",
    narrative:
      "The operational war-room is designed to reduce coordination cognitive load, not increase anxiety. It surfaces what needs attention based on signal evidence — not algorithmic alarm generation. If the war-room shows pressure, that pressure reflects real ingested signals.",
    isHonest: true,
    exposesUncertainty: true,
    avoidsFakeConfidence: true,
  },
  {
    id: "narrative-empty-state-honesty",
    context: "empty_state",
    narrative:
      "PMFreak surfaces insights from real ingested signals — not fabricated indicators. An empty view reflects honest signal absence. As your workspace accumulates coordination history, this section will populate with genuine operational intelligence.",
    isHonest: true,
    exposesUncertainty: true,
    avoidsFakeConfidence: true,
  },
  {
    id: "narrative-propagation-caveat",
    context: "propagation_modeling",
    narrative:
      "Instability propagation paths are modeled estimates based on coordination topology. They reflect where pressure is likely to spread given current project connections and PM workload distribution. They are not predictions of what will happen — they are inputs to human intervention judgment.",
    isHonest: true,
    exposesUncertainty: true,
    avoidsFakeConfidence: true,
  },
  {
    id: "narrative-first-value",
    context: "first_value_milestone",
    narrative:
      "PMFreak has reached a sufficient baseline of operational context to begin generating bounded-certainty insights. Signal quality will continue to improve as more coordination history is accumulated. Current insights reflect early-stage operational cognition — meaningful but incomplete.",
    isHonest: true,
    exposesUncertainty: true,
    avoidsFakeConfidence: true,
  },
];

export function retrieveEnterpriseUXNarratives(): EnterpriseUXNarrative[] {
  const now = new Date().toISOString();
  return NARRATIVE_REGISTRY.map((n) => ({
    ...n,
    generatedAt: now,
  }));
}

export function retrieveNarrativeByContext(
  context: string
): EnterpriseUXNarrative | null {
  const found = NARRATIVE_REGISTRY.find((n) => n.context === context);
  if (!found) return null;
  return {
    ...found,
    generatedAt: new Date().toISOString(),
  };
}

export function retrieveNarrativeById(
  id: string
): EnterpriseUXNarrative | null {
  const found = NARRATIVE_REGISTRY.find((n) => n.id === id);
  if (!found) return null;
  return {
    ...found,
    generatedAt: new Date().toISOString(),
  };
}

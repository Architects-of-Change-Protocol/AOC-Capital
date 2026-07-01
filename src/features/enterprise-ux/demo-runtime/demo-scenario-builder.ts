import type {
  DemoScenario,
  DemoScenarioCategory,
  DemoSignal,
  DemoTopologyNode,
} from "../types/enterprise-ux-types";

const DATA_TAG = "SYNTHETIC_DEMO" as const;

function buildTimestamp(offsetMinutes: number): string {
  const base = new Date("2025-01-15T09:00:00Z");
  base.setMinutes(base.getMinutes() + offsetMinutes);
  return base.toISOString();
}

export function buildDeliveryPressureScenario(): DemoScenario {
  const topology: DemoTopologyNode[] = [
    {
      id: "proj-alpha",
      label: "Project Alpha (SYNTHETIC)",
      type: "project",
      pressureLevel: "high",
      survivabilityScore: 0.42,
      connections: ["proj-beta", "pm-chen", "stakeholder-vp-eng"],
      dataTag: DATA_TAG,
    },
    {
      id: "proj-beta",
      label: "Project Beta (SYNTHETIC)",
      type: "project",
      pressureLevel: "medium",
      survivabilityScore: 0.65,
      connections: ["proj-alpha", "pm-ramirez"],
      dataTag: DATA_TAG,
    },
    {
      id: "pm-chen",
      label: "PM: Chen (SYNTHETIC)",
      type: "pm",
      pressureLevel: "high",
      survivabilityScore: 0.38,
      connections: ["proj-alpha"],
      dataTag: DATA_TAG,
    },
    {
      id: "pm-ramirez",
      label: "PM: Ramirez (SYNTHETIC)",
      type: "pm",
      pressureLevel: "medium",
      survivabilityScore: 0.71,
      connections: ["proj-beta"],
      dataTag: DATA_TAG,
    },
    {
      id: "stakeholder-vp-eng",
      label: "VP Engineering (SYNTHETIC)",
      type: "stakeholder",
      pressureLevel: "critical",
      survivabilityScore: 0.29,
      connections: ["proj-alpha"],
      dataTag: DATA_TAG,
    },
  ];

  const signals: DemoSignal[] = [
    {
      id: "sig-001",
      source: "Jira (SYNTHETIC)",
      signalType: "escalation",
      intensity: "high",
      description:
        "SYNTHETIC: 14 unresolved blockers accumulated in Project Alpha sprint over 3 days.",
      lineage: "Synthetic Jira connector — demo data only, not real customer data.",
      uncertainty:
        "Blocker severity is estimated from count and age. Root causes are unknown from this signal alone.",
      dataTag: DATA_TAG,
      timestamp: buildTimestamp(0),
    },
    {
      id: "sig-002",
      source: "Calendar (SYNTHETIC)",
      signalType: "coordination_gap",
      intensity: "medium",
      description:
        "SYNTHETIC: PM Chen has 6 consecutive days without a sync meeting with Project Alpha stakeholders.",
      lineage: "Synthetic Calendar connector — demo data only.",
      uncertainty:
        "Meeting absence may indicate async coordination rather than disengagement. PMFreak cannot distinguish from calendar data alone.",
      dataTag: DATA_TAG,
      timestamp: buildTimestamp(30),
    },
    {
      id: "sig-003",
      source: "Slack (SYNTHETIC)",
      signalType: "escalation_congestion",
      intensity: "high",
      description:
        "SYNTHETIC: VP Engineering channel activity spike — 43 messages in 2 hours mentioning Project Alpha delivery timeline.",
      lineage: "Synthetic Slack connector — demo data only.",
      uncertainty:
        "Message volume indicates attention but PMFreak cannot assess tone or resolution status from volume alone.",
      dataTag: DATA_TAG,
      timestamp: buildTimestamp(60),
    },
  ];

  return {
    id: "scenario-delivery-pressure",
    name: "Delivery Pressure — SYNTHETIC DEMO",
    description:
      "A synthetic demonstration of how PMFreak detects accumulating delivery pressure across project topology. All data is fabricated and explicitly labeled. No real customer data is present.",
    dataTag: DATA_TAG,
    category: "delivery_pressure",
    narratives: [
      "SYNTHETIC: Project Alpha is exhibiting high survivability degradation based on blocker accumulation and coordination gap signals.",
      "SYNTHETIC: PM Chen's workload density is approaching a threshold associated with coordination quality decline in similar synthetic scenarios.",
      "SYNTHETIC: Instability propagation from Project Alpha to Project Beta is modeled as medium probability based on shared PM topology.",
      "Uncertainty disclosure: These are synthetic signals. Confidence in real deployments depends on actual ingested signal quality.",
    ],
    topology,
    signals,
    uncertaintyNote:
      "All signals in this scenario are synthetic. Survivability scores and propagation paths are illustrative, not predictive.",
    lineageNote:
      "Source lineage is preserved in this demo scenario. Every synthetic signal is tagged SYNTHETIC_DEMO to prevent confusion with real runtime data.",
    createdAt: buildTimestamp(0),
  };
}

export function buildEscalationCongestionScenario(): DemoScenario {
  const topology: DemoTopologyNode[] = [
    {
      id: "escalation-queue",
      label: "Escalation Queue (SYNTHETIC)",
      type: "escalation_point",
      pressureLevel: "critical",
      survivabilityScore: 0.21,
      connections: ["proj-gamma", "proj-delta", "proj-epsilon"],
      dataTag: DATA_TAG,
    },
    {
      id: "proj-gamma",
      label: "Project Gamma (SYNTHETIC)",
      type: "project",
      pressureLevel: "critical",
      survivabilityScore: 0.18,
      connections: ["escalation-queue"],
      dataTag: DATA_TAG,
    },
    {
      id: "proj-delta",
      label: "Project Delta (SYNTHETIC)",
      type: "project",
      pressureLevel: "high",
      survivabilityScore: 0.45,
      connections: ["escalation-queue"],
      dataTag: DATA_TAG,
    },
    {
      id: "proj-epsilon",
      label: "Project Epsilon (SYNTHETIC)",
      type: "project",
      pressureLevel: "medium",
      survivabilityScore: 0.60,
      connections: ["escalation-queue"],
      dataTag: DATA_TAG,
    },
  ];

  const signals: DemoSignal[] = [
    {
      id: "esc-sig-001",
      source: "Input Hub (SYNTHETIC)",
      signalType: "escalation",
      intensity: "high",
      description:
        "SYNTHETIC: 3 simultaneous escalation requests pending resolution for more than 48 hours.",
      lineage: "Synthetic Input Hub entry — demo data only.",
      uncertainty:
        "Escalation age is measurable. Resolution likelihood is not derivable from this signal alone.",
      dataTag: DATA_TAG,
      timestamp: buildTimestamp(0),
    },
  ];

  return {
    id: "scenario-escalation-congestion",
    name: "Escalation Congestion — SYNTHETIC DEMO",
    description:
      "Demonstrates how simultaneous unresolved escalations create coordination bottlenecks across project topology. All data is synthetic.",
    dataTag: DATA_TAG,
    category: "escalation_congestion",
    narratives: [
      "SYNTHETIC: The escalation queue has reached a congestion threshold where new escalations cannot receive adequate attention.",
      "SYNTHETIC: Project Gamma survivability has dropped below the intervention threshold.",
      "Uncertainty disclosure: Escalation resolution timelines in this demo are illustrative only.",
    ],
    topology,
    signals,
    uncertaintyNote:
      "All escalation data is synthetic. No real customer escalation data is present.",
    lineageNote:
      "Each synthetic signal retains source lineage tags to demonstrate PMFreak's lineage preservation in real deployments.",
    createdAt: buildTimestamp(0),
  };
}

export function buildDemoScenario(
  category: DemoScenarioCategory
): DemoScenario | null {
  switch (category) {
    case "delivery_pressure":
      return buildDeliveryPressureScenario();
    case "escalation_congestion":
      return buildEscalationCongestionScenario();
    default:
      return null;
  }
}

export function retrieveAllDemoScenarioCategories(): DemoScenarioCategory[] {
  return [
    "delivery_pressure",
    "escalation_congestion",
    "pm_overload",
    "survivability_degradation",
    "intervention_stabilization",
    "connector_federation",
    "organizational_instability",
  ];
}

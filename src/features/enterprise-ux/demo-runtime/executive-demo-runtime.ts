import type {
  DemoAudience,
  DemoScenarioCategory,
  ExecutiveDemoScenario,
} from "../types/enterprise-ux-types";
import {
  buildDeliveryPressureScenario,
  buildEscalationCongestionScenario,
  buildDemoScenario,
} from "./demo-scenario-builder";

const DATA_DISCLAIMER =
  "ALL DATA IN THIS DEMO IS SYNTHETIC AND EXPLICITLY LABELED 'SYNTHETIC_DEMO'. " +
  "This demo does not contain real customer data, real operational signals, or real survivability measurements. " +
  "Narratives and topology shown are illustrative. Real deployments use only your organization's ingested signals.";

export function buildExecutiveDemoScenario(
  audience: DemoAudience,
  category: DemoScenarioCategory = "delivery_pressure"
): ExecutiveDemoScenario | null {
  const scenario = buildDemoScenario(category);
  if (!scenario) return null;

  const narratives = retrieveExecutiveDemoNarratives(audience, category);
  const walkthroughSteps = buildWalkthroughSteps(audience);

  return {
    id: `demo-${audience}-${category}`,
    name: `${audienceLabel(audience)} Demo — ${scenario.name}`,
    audience,
    scenario,
    narratives,
    walkthroughSteps,
    governanceSummary:
      "This demo preserves PMFreak's governance semantics: source lineage, bounded uncertainty, and tenant isolation are all reflected in the synthetic data structure.",
    dataDisclaimer: DATA_DISCLAIMER,
  };
}

export function retrieveExecutiveDemoNarratives(
  audience: DemoAudience,
  category: DemoScenarioCategory
): string[] {
  const base = [
    `SYNTHETIC DEMO — ${audienceLabel(audience)} walkthrough for ${category.replace(/_/g, " ")} scenario.`,
    "All signals, survivability scores, and topology shown are fabricated for demonstration purposes.",
    "In a live deployment, these narratives would be generated from your organization's real ingested operational signals.",
  ];

  const audienceNarratives: Record<DemoAudience, string[]> = {
    executive: [
      "SYNTHETIC: Delivery pressure in this simulated program is concentrated in two projects, creating executive attention demand.",
      "SYNTHETIC: The survivability model suggests intervention within 5 working days to prevent propagation to adjacent projects.",
      "SYNTHETIC: This summary reflects bounded operational certainty — PMFreak discloses what it does not know.",
    ],
    pm: [
      "SYNTHETIC: PM workload distribution shows uneven escalation absorption across the simulated team.",
      "SYNTHETIC: Blocker accumulation patterns suggest coordination protocols may need adjustment.",
      "SYNTHETIC: PMFreak recommends reviewing escalation routing, not specific individuals.",
    ],
    governance: [
      "SYNTHETIC: All simulated interventions would require human authorization before execution.",
      "SYNTHETIC: Governance boundaries are preserved — no automated action would cross approval thresholds.",
      "SYNTHETIC: Source lineage is maintained on every signal, including synthetic ones.",
    ],
    war_room: [
      "SYNTHETIC: The operational pulse shows simulated escalation congestion across three connected projects.",
      "SYNTHETIC: Survivability degradation is modeled as propagating from the primary project to adjacent nodes.",
      "SYNTHETIC: Intervention recommendations are listed in order of estimated stabilization impact.",
    ],
    federation: [
      "SYNTHETIC: Connector signals from Jira, Slack, and Calendar are correlated without cross-tenant data mixing.",
      "SYNTHETIC: Source lineage for each connector is preserved — you can trace every correlation to its origin.",
      "SYNTHETIC: Governance boundaries ensure that federation correlation does not expose restricted data.",
    ],
  };

  return [...base, ...(audienceNarratives[audience] ?? [])];
}

export function retrieveExecutiveDemoTopology(
  category: DemoScenarioCategory
) {
  const scenario = buildDemoScenario(category);
  return scenario?.topology ?? [];
}

function buildWalkthroughSteps(audience: DemoAudience) {
  const steps: Record<DemoAudience, ReturnType<typeof buildWalkthroughStepList>> = {
    executive: buildWalkthroughStepList([
      {
        title: "Operational overview",
        explanation:
          "This is a synthetic operational overview. In live deployments, PMFreak would surface real project survivability signals here.",
        whatToShow: "The topology map with survivability scores.",
        governanceNote: null,
        uncertaintyNote: "Survivability scores are illustrative in this demo.",
      },
      {
        title: "Escalation pressure summary",
        explanation:
          "Escalation pressure is summarized for executive stakeholders with bounded-certainty language.",
        whatToShow: "The escalation signal list with lineage tags.",
        governanceNote: "Governance boundaries prevent escalation details from surfacing to unauthorized viewers.",
        uncertaintyNote: "Escalation severity estimates include confidence ranges in live deployments.",
      },
      {
        title: "Recommended intervention",
        explanation:
          "SYNTHETIC: PMFreak surfaces intervention recommendations ranked by estimated stabilization impact. Human authorization is required before any intervention executes.",
        whatToShow: "The intervention recommendation panel.",
        governanceNote: "No intervention executes without human approval in live deployments.",
        uncertaintyNote: "Intervention effectiveness estimates include uncertainty ranges.",
      },
    ]),
    pm: buildWalkthroughStepList([
      {
        title: "Project survivability view",
        explanation:
          "SYNTHETIC: Each project shows a survivability score derived from coordination signals.",
        whatToShow: "The project survivability breakdown.",
        governanceNote: null,
        uncertaintyNote: "Survivability scores reflect signal quality. Low ingestion = low confidence.",
      },
      {
        title: "Blocker and escalation flow",
        explanation:
          "SYNTHETIC: Blocker accumulation patterns are visualized across projects.",
        whatToShow: "The signal feed with blocker intensity indicators.",
        governanceNote: null,
        uncertaintyNote: null,
      },
    ]),
    governance: buildWalkthroughStepList([
      {
        title: "Governance boundary visualization",
        explanation:
          "SYNTHETIC: Governance boundaries are shown as explicit constraints on operational data flow.",
        whatToShow: "The governance boundary overlay on the topology map.",
        governanceNote: "Governance boundaries are workspace-level in live deployments.",
        uncertaintyNote: null,
      },
      {
        title: "Source lineage inspection",
        explanation:
          "SYNTHETIC: Every signal and insight has traceable lineage back to its source.",
        whatToShow: "The lineage view on any signal card.",
        governanceNote: "Lineage cannot be modified after ingestion.",
        uncertaintyNote: null,
      },
    ]),
    war_room: buildWalkthroughStepList([
      {
        title: "Operational pulse",
        explanation:
          "SYNTHETIC: The operational pulse reflects coordination activity rhythm across projects.",
        whatToShow: "The pulse visualization at the top of the war-room.",
        governanceNote: null,
        uncertaintyNote: "Pulse gaps indicate ingestion gaps, not necessarily coordination silence.",
      },
      {
        title: "Propagation path",
        explanation:
          "SYNTHETIC: Instability propagation paths show how pressure spreads across connected projects.",
        whatToShow: "The propagation visualization on the topology map.",
        governanceNote: null,
        uncertaintyNote: "Propagation paths are modeled estimates, not guaranteed futures.",
      },
    ]),
    federation: buildWalkthroughStepList([
      {
        title: "Multi-connector correlation",
        explanation:
          "SYNTHETIC: Signals from Jira, Slack, and Calendar are correlated to surface cross-system patterns.",
        whatToShow: "The connector attribution badges on each signal.",
        governanceNote: "No connector data crosses tenant boundaries.",
        uncertaintyNote: "Cross-system correlations are probabilistic, not deterministic.",
      },
    ]),
  };

  return steps[audience] ?? [];
}

function buildWalkthroughStepList(
  items: Array<{
    title: string;
    explanation: string;
    whatToShow: string;
    governanceNote: string | null;
    uncertaintyNote: string | null;
  }>
) {
  return items.map((item, index) => ({
    order: index + 1,
    ...item,
  }));
}

function audienceLabel(audience: DemoAudience): string {
  const labels: Record<DemoAudience, string> = {
    executive: "Executive",
    pm: "PM",
    governance: "Governance",
    war_room: "War Room",
    federation: "Federation",
  };
  return labels[audience] ?? audience;
}

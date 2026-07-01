import type {
  OperationalTour,
  OperationalTourStep,
} from "../types/enterprise-ux-types";

export function buildOperationalTour(): OperationalTour {
  return {
    tourId: "platform-orientation-v1",
    name: "PMFreak Platform Orientation",
    steps: buildTourSteps(),
    estimatedMinutes: 8,
  };
}

function buildTourSteps(): OperationalTourStep[] {
  return [
    {
      id: "tour-input-hub",
      order: 1,
      concept: "operational-ingestion",
      title: "The Input Hub — where operational signals enter",
      narrative:
        "The Input Hub is where you capture operational signals — meeting outcomes, blockers, escalations, status updates. These signals become the raw material for operational cognition. Without ingestion, PMFreak has nothing to work with.",
      whatYouAreSeeingExplanation:
        "You are seeing the primary ingestion interface. Signals captured here are processed through PMFreak's digestive system and stored in workspace-scoped operational memory.",
      governanceNote:
        "Ingested content is workspace-scoped and tenant-isolated from creation.",
      uncertaintyNote:
        "Signal quality affects insight quality. Sparse or ambiguous ingestion produces lower-confidence operational intelligence.",
      route: "/input-hub",
    },
    {
      id: "tour-operational-memory",
      order: 2,
      concept: "operational-memory",
      title: "Operational Memory — what PMFreak remembers",
      narrative:
        "Operational memory is PMFreak's persistent context store — accumulated coordination history, past escalation decisions, project milestones, and signal patterns. Memory enables continuity across sessions and powers context-aware operational intelligence.",
      whatYouAreSeeingExplanation:
        "You are seeing the structured operational memory for your workspace. Each entry has a source, timestamp, and content hash for integrity verification.",
      governanceNote: "Memory entries are workspace-scoped and immutable after ingestion.",
      uncertaintyNote:
        "Memory reflects what was ingested, not operational ground truth. If coordination events were not ingested, they are invisible to PMFreak's memory.",
      route: "/operational-memory",
    },
    {
      id: "tour-command-center",
      order: 3,
      concept: "war-room",
      title: "The Command Center — operational intelligence in one view",
      narrative:
        "The Command Center synthesizes operational pulse, survivability signals, escalation pressure, and propagation paths into a coherent operational picture. It is designed for coordination, not surveillance.",
      whatYouAreSeeingExplanation:
        "You are seeing the operational war-room. It surfaces coordination pressure and survivability signals from your ingested data.",
      governanceNote:
        "War-room visibility is role-scoped. Viewer roles see aggregate summaries. PM and admin roles see full operational detail with lineage.",
      uncertaintyNote:
        "The war-room is only as accurate as the signals that feed it. Low ingestion frequency = low confidence in the operational picture.",
      route: "/command-center",
    },
    {
      id: "tour-intelligence",
      order: 4,
      concept: "cross-domain-intelligence",
      title: "Intelligence — cross-domain pattern detection",
      narrative:
        "The Intelligence module surfaces correlations across projects, teams, and coordination signals that are not visible in any single system. It identifies systemic operational patterns — not just individual project issues.",
      whatYouAreSeeingExplanation:
        "You are seeing cross-domain correlations derived from operational signals. Each insight includes its source lineage and confidence level.",
      governanceNote:
        "Intelligence correlations are workspace-scoped. Cross-tenant intelligence correlation is not possible within PMFreak's governance model.",
      uncertaintyNote:
        "Correlation is not causation. Intelligence insights require human interpretation before informing decisions.",
      route: "/intelligence",
    },
    {
      id: "tour-executive",
      order: 5,
      concept: "executive-synthesis",
      title: "Executive View — operational context for stakeholders",
      narrative:
        "The Executive View translates operational complexity into stakeholder-appropriate summaries with bounded-certainty language. It is not a marketing dashboard — it is an honest operational narrative for decision-makers.",
      whatYouAreSeeingExplanation:
        "You are seeing the executive synthesis of current operational state. Each summary includes confidence qualifiers and knowledge gap disclosures.",
      governanceNote:
        "Executive digests are generated from real ingested signals. Fabricated summaries are not produced.",
      uncertaintyNote:
        "Executive digests include explicit uncertainty disclosures. PMFreak does not claim operational omniscience in stakeholder-facing outputs.",
      route: "/executive",
    },
    {
      id: "tour-governance",
      order: 6,
      concept: "governance",
      title: "Governance — human authority over automated coordination",
      narrative:
        "PMFreak's governance layer ensures that automated coordination recommendations always respect human decision authority. Approvals, delegations, and capability grants are tracked here.",
      whatYouAreSeeingExplanation:
        "You are seeing the governance control interface. Any pending approvals for recommended interventions appear here.",
      governanceNote:
        "No intervention executes without explicit human authorization. Governance boundaries are enforced at the runtime level.",
      uncertaintyNote: null,
      route: "/governance",
    },
    {
      id: "tour-diagnostics",
      order: 7,
      concept: "runtime-health",
      title: "Runtime health — what PMFreak knows about itself",
      narrative:
        "PMFreak surfaces its own runtime health — ingestion status, memory integrity, API health, and operational SLO compliance. This transparency helps you understand how reliable the operational intelligence is.",
      whatYouAreSeeingExplanation:
        "You are seeing PMFreak's self-diagnostics. These reflect the platform's ability to produce reliable operational intelligence.",
      governanceNote: null,
      uncertaintyNote:
        "Runtime health metrics reflect PMFreak's infrastructure state, not your operational state. A healthy runtime with sparse ingestion still produces low-confidence insights.",
      route: null,
    },
  ];
}

export function retrieveTourSteps(): OperationalTourStep[] {
  return buildOperationalTour().steps;
}

export function retrieveTourNarratives(): string[] {
  return buildTourSteps().map((step) => step.narrative);
}

export function retrieveTourStepById(stepId: string): OperationalTourStep | null {
  return buildTourSteps().find((s) => s.id === stepId) ?? null;
}

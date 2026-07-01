export interface WarRoomExplainerSection {
  id: string;
  concept: string;
  headline: string;
  plainLanguageExplanation: string;
  whatItIsNot: string;
  howToReadIt: string;
  uncertaintyNote: string;
  governanceNote: string | null;
}

export function buildFirstWarRoomExperience(): {
  greeting: string;
  orientationNarrative: string;
  explainers: WarRoomExplainerSection[];
  reassurance: string;
} {
  return {
    greeting: "Welcome to the operational war-room.",
    orientationNarrative:
      "This is PMFreak's Command Center — a place to understand operational pressure, survivability signals, and escalation patterns across your projects. " +
      "It is designed to surface what matters without overwhelming you with noise. " +
      "Everything you see here is derived from real ingested signals. If the war-room looks sparse, that reflects your current signal state — not a missing feature.",

    explainers: buildWarRoomExplainers(),

    reassurance:
      "PMFreak's war-room is not meant to feel like a crisis dashboard. " +
      "It is an operational intelligence surface — designed to reduce the cognitive load of coordination, not increase anxiety. " +
      "Every insight includes its source lineage and uncertainty disclosure. If something looks concerning, you can always trace it back to the signals that generated it.",
  };
}

function buildWarRoomExplainers(): WarRoomExplainerSection[] {
  return [
    {
      id: "operational-pulse",
      concept: "Operational Pulse",
      headline: "The rhythm of coordination activity",
      plainLanguageExplanation:
        "The operational pulse shows the real-time rhythm of coordination activity across your projects — escalations, ingested signals, meeting patterns, and blocker accumulation. A healthy pulse indicates active coordination. Anomalies indicate coordination gaps.",
      whatItIsNot:
        "Not a productivity tracker. Not a surveillance metric. Not a measure of individual performance.",
      howToReadIt:
        "A declining pulse may indicate coordination silence — projects going quiet. A spike may indicate escalation congestion. Both are early warning signals, not alarms.",
      uncertaintyNote:
        "Pulse reflects ingested signals. If you are not ingesting regularly, the pulse will appear low even if coordination is healthy. Gaps in ingestion = gaps in pulse visibility.",
      governanceNote: "Pulse data is workspace-scoped. Individual activity is never exposed across governance boundaries.",
    },
    {
      id: "survivability",
      concept: "Survivability Score",
      headline: "How well a project can sustain coordinated progress",
      plainLanguageExplanation:
        "A survivability score reflects a project's current ability to continue making coordinated progress under existing pressure conditions. It is derived from blocker accumulation, coordination activity, escalation patterns, and PM load signals.",
      whatItIsNot:
        "Not a prediction of project failure. Not a health score out of 100. Not a guarantee of delivery outcome.",
      howToReadIt:
        "Higher survivability means the project is absorbing current pressure without showing coordination degradation signals. Lower survivability means intervention may be warranted — not that the project is failing.",
      uncertaintyNote:
        "Survivability scores are derived from available signals. Limited signal ingestion produces lower-confidence scores. Confidence levels are disclosed alongside every score.",
      governanceNote: null,
    },
    {
      id: "propagation",
      concept: "Instability Propagation",
      headline: "How pressure spreads across connected projects",
      plainLanguageExplanation:
        "When a project accumulates escalation pressure, that pressure often spreads to connected projects and stakeholders through shared PMs, dependencies, and coordination paths. Propagation paths model where breakdown risk is likely to spread.",
      whatItIsNot:
        "Not a certainty about what will happen. Not a blame map. Not an automated root-cause finding.",
      howToReadIt:
        "Propagation paths show modeled spread risk based on current topology. The wider the path, the more projects are potentially affected. Use this to prioritize intervention focus.",
      uncertaintyNote:
        "Propagation paths are model outputs. They reflect estimated risk spread, not confirmed breakdown. Always review with direct operational knowledge.",
      governanceNote: null,
    },
    {
      id: "operational-narratives",
      concept: "Operational Narratives",
      headline: "Plain language synthesis of operational state",
      plainLanguageExplanation:
        "Operational narratives translate raw signal correlations into plain language observations about your projects' coordination health. They include explicit uncertainty disclosures and source lineage.",
      whatItIsNot:
        "Not AI-generated fiction. Not marketing copy. Not authoritative decisions. Not guaranteed accuracy.",
      howToReadIt:
        "Each narrative includes a confidence qualifier. 'High confidence' means strong signal support. 'Low confidence' means limited signals — treat narratives with appropriate skepticism.",
      uncertaintyNote:
        "Narratives expose their reasoning. If a narrative seems wrong, check its source signals — the error likely originates there, not in the synthesis.",
      governanceNote:
        "Narratives that involve governance-sensitive signals include explicit boundary disclosures.",
    },
    {
      id: "escalation-pressure",
      concept: "Escalation Pressure",
      headline: "The volume and urgency of unresolved escalations",
      plainLanguageExplanation:
        "Escalation pressure reflects the accumulated load of unresolved escalations in your workspace — how many exist, how old they are, and how they map to projects and PMs.",
      whatItIsNot:
        "Not a performance evaluation. Not an automated escalation resolver. Not a priority queue you must work through in order.",
      howToReadIt:
        "High escalation pressure with aging items (>48 hours unresolved) is a survivability risk indicator. Cross-project escalation pressure suggests systemic coordination problems rather than project-specific issues.",
      uncertaintyNote:
        "Escalation pressure is based on ingested escalation signals. Escalations not captured in PMFreak are invisible to this metric.",
      governanceNote: "Escalation visibility is role-scoped. Viewer-role users see aggregate pressure, not individual escalation details.",
    },
  ];
}

export function retrieveWarRoomOrientationNarrative(): string {
  return buildFirstWarRoomExperience().orientationNarrative;
}

export function retrieveWarRoomExplainers(): WarRoomExplainerSection[] {
  return buildWarRoomExplainers();
}

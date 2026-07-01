import type {
  GuidedCognitionConcept,
  GuidedCognitionStep,
} from "../types/enterprise-ux-types";

export function buildGuidedCognitionConceptLibrary(): GuidedCognitionConcept[] {
  return [
    {
      id: "operational-cognition",
      term: "Operational Cognition",
      plainLanguageExplanation:
        "PMFreak's ability to understand what is happening across your projects by collecting and correlating signals — without pretending to know more than the signals reveal.",
      whyItMatters:
        "Without operational cognition, coordination breakdowns go undetected until they become crises. PMFreak surfaces pressure before it escalates.",
      whatItIsNot:
        "Not an AI oracle. Not a replacement for human judgment. Not a system that claims certainty it does not have.",
      uncertaintyNote:
        "Operational cognition is bounded. PMFreak discloses confidence levels and knowledge gaps on every insight.",
      governanceBoundary:
        "Operational cognition operates within workspace governance boundaries. Insights are never surfaced across tenant lines.",
      learnMoreHref: null,
    },
    {
      id: "survivability",
      term: "Operational Survivability",
      plainLanguageExplanation:
        "A project's ability to continue making coordinated progress under pressure — escalation, blocker accumulation, or PM overload.",
      whyItMatters:
        "Projects with low survivability are at risk of coordination collapse. Early detection allows intervention before delivery is compromised.",
      whatItIsNot:
        "Not a project health score. Not a prediction of project failure. Not a guarantee of delivery.",
      uncertaintyNote:
        "Survivability scores reflect current signal strength, not future certainty. Confidence is always disclosed.",
      governanceBoundary: null,
      learnMoreHref: null,
    },
    {
      id: "operational-pulse",
      term: "Operational Pulse",
      plainLanguageExplanation:
        "The real-time rhythm of coordination activity across your projects — escalations, blockers, meeting density, and signal ingestion.",
      whyItMatters:
        "Pulse anomalies often precede delivery problems. A project going quiet can be as dangerous as one generating too many escalations.",
      whatItIsNot:
        "Not a vanity activity metric. Not a productivity tracker. Not a surveillance tool.",
      uncertaintyNote:
        "Pulse is derived from ingested signals. Gaps in ingestion mean gaps in pulse visibility.",
      governanceBoundary:
        "Pulse data is workspace-scoped. PM activity is never exposed across governance boundaries.",
      learnMoreHref: null,
    },
    {
      id: "instability-propagation",
      term: "Instability Propagation",
      plainLanguageExplanation:
        "How pressure or breakdown in one part of your program spreads to connected projects and stakeholders.",
      whyItMatters:
        "In complex programs, a single stalled project can create downstream escalation congestion across teams. Propagation mapping helps contain this.",
      whatItIsNot:
        "Not a blame assignment system. Not an automated root-cause finder. Not a certainty about what will happen.",
      uncertaintyNote:
        "Propagation paths are modeled, not measured. They reflect likely spread based on coordination topology, not certainty.",
      governanceBoundary: null,
      learnMoreHref: null,
    },
    {
      id: "operational-lineage",
      term: "Operational Lineage",
      plainLanguageExplanation:
        "The traceable path from raw operational signal to insight — so you always know where a PMFreak observation came from.",
      whyItMatters:
        "Trust requires traceability. If PMFreak says a project is under escalation pressure, you should be able to trace that claim back to real signals.",
      whatItIsNot:
        "Not a perfect audit trail. Not a legal record. Not immunity from inference errors.",
      uncertaintyNote:
        "Lineage shows signal origin, but inference from signals can still be wrong. Uncertainty is always disclosed alongside lineage.",
      governanceBoundary:
        "Lineage is workspace-scoped. Source attribution does not cross tenant boundaries.",
      learnMoreHref: null,
    },
    {
      id: "bounded-uncertainty",
      term: "Bounded Uncertainty",
      plainLanguageExplanation:
        "PMFreak's practice of explicitly stating what it does not know — and how confident it is — alongside every insight it generates.",
      whyItMatters:
        "Operational intelligence is only trustworthy if it is honest about its limits. Bounded uncertainty prevents over-reliance on automated insights.",
      whatItIsNot:
        "Not an excuse for low-quality insights. Not a disclaimer wall. Not uncertainty theater.",
      uncertaintyNote:
        "Every insight carries a bounded certainty statement. This is a design principle, not a legal hedge.",
      governanceBoundary: null,
      learnMoreHref: null,
    },
    {
      id: "governance-safe-federation",
      term: "Governance-Safe Federation",
      plainLanguageExplanation:
        "The ability to correlate operational signals across multiple systems (Jira, Slack, GitHub, Calendar) while preserving governance boundaries and source lineage.",
      whyItMatters:
        "Most operational failures span multiple tools. Federation allows PMFreak to detect cross-system pressure without exposing data across governance boundaries.",
      whatItIsNot:
        "Not surveillance. Not data consolidation without boundaries. Not cross-tenant data mixing.",
      uncertaintyNote:
        "Federation insights are correlation-based. Correlation is not causation.",
      governanceBoundary:
        "Each connector maintains its own source lineage. Federation correlation is workspace-scoped.",
      learnMoreHref: null,
    },
  ];
}

export function buildGuidedCognitionSteps(): GuidedCognitionStep[] {
  return [
    {
      id: "step-what-is-this",
      order: 1,
      title: "What PMFreak actually does",
      narrative:
        "PMFreak collects operational signals from your projects and coordination activity, then surfaces pressure, survivability risks, and escalation patterns — with explicit disclosure of what it knows and does not know.",
      conceptIds: ["operational-cognition"],
      requiredContext: [],
      completionSignal: "User has read the operational cognition explanation.",
    },
    {
      id: "step-survivability",
      order: 2,
      title: "Understanding operational survivability",
      narrative:
        "Survivability tells you whether a project can sustain coordinated progress under current pressure conditions. It is not a health score. It is a signal about coordination resilience.",
      conceptIds: ["survivability", "operational-pulse"],
      requiredContext: ["first-project"],
      completionSignal: "User has a project and has viewed survivability explanation.",
    },
    {
      id: "step-propagation",
      order: 3,
      title: "How pressure spreads",
      narrative:
        "When one project accumulates escalation congestion, it often creates downstream pressure on connected projects and stakeholders. PMFreak models these propagation paths to help you intervene before the spread becomes unmanageable.",
      conceptIds: ["instability-propagation"],
      requiredContext: ["first-project"],
      completionSignal: "User understands propagation modeling.",
    },
    {
      id: "step-lineage",
      order: 4,
      title: "Where insights come from",
      narrative:
        "Every PMFreak insight is traceable to the signals that informed it. Lineage ensures that operational intelligence is auditable and not a black box.",
      conceptIds: ["operational-lineage", "bounded-uncertainty"],
      requiredContext: ["first-ingestion"],
      completionSignal: "User has ingested at least one signal and reviewed lineage.",
    },
    {
      id: "step-federation",
      order: 5,
      title: "Connecting systems safely",
      narrative:
        "Federation allows PMFreak to correlate pressure signals across Jira, Slack, GitHub, and Calendar while keeping governance boundaries intact. You can see cross-system patterns without losing source attribution.",
      conceptIds: ["governance-safe-federation"],
      requiredContext: ["connector-intention"],
      completionSignal: "User has declared connector intentions.",
    },
  ];
}

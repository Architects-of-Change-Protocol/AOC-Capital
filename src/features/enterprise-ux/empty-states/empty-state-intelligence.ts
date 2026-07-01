import type { EmptyStateGuidance } from "../types/enterprise-ux-types";

const EMPTY_STATE_REGISTRY: EmptyStateGuidance[] = [
  {
    route: "/projects",
    headline: "Operational cognition begins with project context.",
    educationalBody:
      "Operational cognition becomes more valuable once project coordination, escalation flow, or delivery pressure signals are available. A project gives PMFreak a boundary within which to track survivability, memory, and intervention paths.",
    valueExplanation:
      "Projects are the primary unit of coordination in PMFreak. Without at least one project, survivability modeling, war-room activation, and executive digest generation are unavailable.",
    governanceNote:
      "Projects are workspace-scoped and tenant-isolated. No project data crosses governance boundaries without explicit federation authorization.",
    primaryActionLabel: "Create your first project",
    primaryActionHref: "/projects",
    secondaryContext:
      "You can connect signals to your project once created — from meetings, blockers, escalations, or tool integrations.",
  },
  {
    route: "/command-center",
    headline: "The war-room activates when operational signals are present.",
    educationalBody:
      "PMFreak's Command Center surfaces escalation paths, survivability degradations, and intervention recommendations — but only from real ingested signals. It is currently awaiting operational context.",
    valueExplanation:
      "The war-room is not a dashboard of indicators. It is a synthesis of operational memory, survivability models, and propagation paths built from your actual coordination activity.",
    governanceNote:
      "War-room visibility is role-scoped. Viewer roles receive sanitized summaries. PM and admin roles receive full operational detail with source lineage.",
    primaryActionLabel: "Ingest your first operational signal",
    primaryActionHref: "/input-hub",
    secondaryContext:
      "Once signals are ingested, the war-room will surface its first operational pulse within minutes.",
  },
  {
    route: "/intelligence",
    headline: "Cross-domain intelligence requires multi-signal context.",
    educationalBody:
      "Intelligence correlation becomes meaningful once signals from multiple operational sources are available — project status, meeting outcomes, blockers, and stakeholder pressure. Currently, insufficient signal breadth limits what can be correlated.",
    valueExplanation:
      "PMFreak's cross-domain intelligence identifies patterns that span projects, teams, and systems. A single signal is a data point. Multiple correlated signals reveal operational topology.",
    governanceNote:
      "Intelligence insights include source lineage for every signal that informed the correlation.",
    primaryActionLabel: "Add operational signals",
    primaryActionHref: "/input-hub",
    secondaryContext: null,
  },
  {
    route: "/operational-memory",
    headline: "Operational memory builds from ingested context.",
    educationalBody:
      "PMFreak's memory layer accumulates and retains coordination signals over time — meeting outcomes, blockers, escalation decisions, and project milestones. Memory is currently empty because no signals have been ingested yet.",
    valueExplanation:
      "Persistent operational memory allows PMFreak to provide context-aware continuity across sessions — referencing past decisions, escalation patterns, and coordination history.",
    governanceNote:
      "Operational memory is workspace-scoped and tenant-isolated. Past context is never surfaced across governance boundaries.",
    primaryActionLabel: "Ingest your first signal",
    primaryActionHref: "/input-hub",
    secondaryContext:
      "Memory strengthens as more signals are ingested. Early entries establish the baseline for survivability modeling.",
  },
  {
    route: "/executive",
    headline: "Executive digests require operational signal depth.",
    educationalBody:
      "Executive-facing operational summaries are generated from real ingested signals, not fabricated. PMFreak needs sufficient project activity and coordination history before it can produce a meaningful, bounded-certainty executive digest.",
    valueExplanation:
      "Executive digests translate operational complexity into stakeholder-appropriate language — with uncertainty disclosures and governance context included by default.",
    governanceNote:
      "Executive digests include bounded-certainty language. PMFreak does not claim false operational omniscience in stakeholder-facing outputs.",
    primaryActionLabel: "Build operational context first",
    primaryActionHref: "/input-hub",
    secondaryContext: null,
  },
  {
    route: "/stakeholder-intel",
    headline: "Stakeholder intelligence emerges from interaction signal patterns.",
    educationalBody:
      "Stakeholder trust and relationship signals are derived from coordination patterns — meeting attendance, escalation involvement, and response latency. These patterns require time and signal accumulation to become meaningful.",
    valueExplanation:
      "Stakeholder intelligence helps identify trust gaps, political risk, and relationship dependencies before they become delivery blockers.",
    governanceNote:
      "Stakeholder data is workspace-scoped. Individual stakeholder patterns are never shared across tenant boundaries.",
    primaryActionLabel: "Add stakeholder coordination signals",
    primaryActionHref: "/input-hub",
    secondaryContext: null,
  },
  {
    route: "/dashboard",
    headline: "Your operational workspace is ready for its first signal.",
    educationalBody:
      "PMFreak's operational hub will surface coordination pressure, survivability signals, and executive context as your workspace accumulates real coordination activity. You are seeing this because your workspace is new.",
    valueExplanation:
      "The dashboard consolidates operational pulse, memory state, escalation summary, and first-value milestones in one place.",
    governanceNote: null,
    primaryActionLabel: "Start with a project",
    primaryActionHref: "/projects",
    secondaryContext:
      "You can also go directly to the Input Hub to capture your first coordination signal.",
  },
];

export function retrieveEmptyStateGuidance(
  route: string
): EmptyStateGuidance | null {
  const normalized = route.split("?")[0].split("#")[0];
  return (
    EMPTY_STATE_REGISTRY.find((g) => g.route === normalized) ?? null
  );
}

export function retrieveAllEmptyStateRoutes(): string[] {
  return EMPTY_STATE_REGISTRY.map((g) => g.route);
}

export function buildFallbackEmptyState(route: string): EmptyStateGuidance {
  return {
    route,
    headline: "This section will activate as your workspace builds operational context.",
    educationalBody:
      "PMFreak surfaces insights from real ingested signals — not fabricated indicators. As your workspace accumulates coordination history, this section will populate with relevant operational intelligence.",
    valueExplanation:
      "Every PMFreak insight is traceable to the signals that informed it. Empty states reflect honest signal absence, not a missing feature.",
    governanceNote: null,
    primaryActionLabel: "Add operational signals",
    primaryActionHref: "/input-hub",
    secondaryContext: null,
  };
}

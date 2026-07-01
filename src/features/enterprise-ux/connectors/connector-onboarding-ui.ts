import type {
  ConnectorId,
  ConnectorOnboardingState,
  ConnectorReadinessStatus,
} from "../types/enterprise-ux-types";

export function buildConnectorOnboardingStates(): ConnectorOnboardingState[] {
  return [
    {
      connectorId: "jira",
      name: "Jira",
      readinessStatus: "not_configured",
      federationValue:
        "Jira federation allows PMFreak to correlate ticket blocker accumulation, sprint pressure, and escalation patterns with broader coordination signals. This surfaces cross-system delivery pressure that is invisible when Jira data is viewed in isolation.",
      lineageExplanation:
        "Each Jira signal ingested by PMFreak retains its source attribution — issue key, project, and sprint context — so insights are always traceable back to specific Jira activity.",
      governanceExplanation:
        "Jira connector data is workspace-scoped. Your Jira project data never crosses tenant boundaries or mixes with other organizations' data.",
      survivabilityEnhancement:
        "Jira integration improves survivability model accuracy by providing blocker count, ticket age, and sprint velocity signals. Without Jira, survivability relies on manually ingested signals.",
      isLiveOAuth: false,
    },
    {
      connectorId: "slack",
      name: "Slack",
      readinessStatus: "not_configured",
      federationValue:
        "Slack federation surfaces escalation congestion patterns, communication gaps, and stakeholder attention signals that are often the earliest indicators of coordination breakdown — before they appear in Jira or project status.",
      lineageExplanation:
        "Slack signal lineage preserves channel context and message timestamp. PMFreak does not store message content — only coordination pattern metadata derived from activity signals.",
      governanceExplanation:
        "Slack connector data is governed by workspace-level access controls. PMFreak accesses only the channels explicitly authorized during connector setup.",
      survivabilityEnhancement:
        "Slack signals allow PMFreak to detect coordination silence — projects where communication has stopped — which is a leading indicator of survivability degradation.",
      isLiveOAuth: false,
    },
    {
      connectorId: "github",
      name: "GitHub",
      readinessStatus: "not_configured",
      federationValue:
        "GitHub federation correlates code delivery signals — PR review latency, deployment frequency, and incident rates — with operational coordination pressure, creating a more complete survivability picture for engineering-heavy projects.",
      lineageExplanation:
        "GitHub signal lineage preserves repository and PR context. Signals are attributed to specific repositories and workflows to maintain operational traceability.",
      governanceExplanation:
        "GitHub connector data is scoped to the repositories explicitly authorized. PMFreak does not access code content — only delivery and coordination metadata.",
      survivabilityEnhancement:
        "GitHub signals improve survivability models for projects with engineering delivery dependencies, adding deployment cadence and review health dimensions.",
      isLiveOAuth: false,
    },
    {
      connectorId: "calendar",
      name: "Calendar",
      readinessStatus: "not_configured",
      federationValue:
        "Calendar federation allows PMFreak to detect meeting density, coordination gaps, and stakeholder availability patterns. Meeting silence is often the first signal of coordination breakdown.",
      lineageExplanation:
        "Calendar signal lineage preserves event metadata — meeting frequency, participant patterns, and scheduling gaps — without exposing meeting content or attendee details beyond what is operationally relevant.",
      governanceExplanation:
        "Calendar connector data is workspace-scoped. PMFreak accesses only meeting metadata, not content, and only for the workspace members who explicitly authorize integration.",
      survivabilityEnhancement:
        "Calendar signals allow PMFreak to detect coordination vacuum — projects with PM activity but no stakeholder meetings — which is an early survivability warning indicator.",
      isLiveOAuth: false,
    },
  ];
}

export function retrieveConnectorOnboardingState(
  connectorId: ConnectorId,
  currentStatus?: ConnectorReadinessStatus
): ConnectorOnboardingState {
  const states = buildConnectorOnboardingStates();
  const base = states.find((s) => s.connectorId === connectorId);
  if (!base) {
    throw new Error(`Unknown connector: ${connectorId}`);
  }
  return {
    ...base,
    readinessStatus: currentStatus ?? base.readinessStatus,
  };
}

export function buildConnectorOnboardingReadinessNarrative(
  state: ConnectorOnboardingState
): string {
  if (state.readinessStatus === "connected") {
    return (
      `${state.name} connector is active. Source lineage attribution and governance boundaries are in effect. ` +
      `Signals from ${state.name} will appear in the operational pulse within the next ingestion cycle.`
    );
  }

  if (state.readinessStatus === "simulated_ready") {
    return (
      `${state.name} connector is in educational simulation mode. ` +
      `No real ${state.name} data is ingested. Federation value explanations and governance documentation are active. ` +
      `To ingest real signals, OAuth configuration is required.`
    );
  }

  return (
    `${state.name} connector is not yet configured. ` +
    state.federationValue +
    ` OAuth configuration is required to begin ingesting real ${state.name} signals. ` +
    `No live integration is active.`
  );
}

export type SignalSource = "jira" | "slack" | "teams" | "github" | "meeting" | "system";
export type OperationalSignalCategory = "escalation" | "blocker" | "delivery" | "communication" | "pressure" | "capacity" | "deployment";

export type JiraEventSignal = { type: "jira_event"; issueKey: string; action: "created" | "updated" | "blocked" | "reopened"; assignee?: string; priority?: string };
export type SlackEventSignal = { type: "slack_event"; channel: string; action: "message" | "thread_escalation" | "reaction"; author?: string };
export type TeamsEventSignal = { type: "teams_event"; team: string; action: "message" | "meeting_alert" | "escalation"; author?: string };
export type GitHubEventSignal = { type: "github_event"; repo: string; action: "pr_opened" | "pr_blocked" | "deployment_failed" | "deployment_succeeded"; actor?: string };
export type MeetingSignal = { type: "meeting_signal"; meetingId: string; action: "decision_made" | "decision_deferred" | "risk_raised"; owner?: string };
export type EscalationSignal = { type: "escalation_signal"; from: string; to: string; reason: string; severity: "watch" | "elevated" | "critical" };
export type BlockerSignal = { type: "blocker_signal"; blockerId: string; owner?: string; state: "opened" | "aging" | "resolved" };
export type DeploymentSignal = { type: "deployment_signal"; environment: "dev" | "staging" | "prod"; result: "success" | "failure" };
export type DeliveryConfidenceSignal = { type: "delivery_confidence_change"; previous: number; next: number; reason: string };
export type StakeholderPressureSignal = { type: "stakeholder_pressure_signal"; stakeholder: string; pressureDelta: number; reason: string };
export type PMOverloadSignal = { type: "pm_overload_signal"; pmId: string; workloadScore: number; openThreads: number };

export type EnterpriseSignalPayload = JiraEventSignal | SlackEventSignal | TeamsEventSignal | GitHubEventSignal | MeetingSignal | EscalationSignal | BlockerSignal | DeploymentSignal | DeliveryConfidenceSignal | StakeholderPressureSignal | PMOverloadSignal;

export type EnterpriseOperationalSignal = {
  signalId: string;
  source: SignalSource;
  sourceEventId: string;
  category: OperationalSignalCategory;
  timestamp: string;
  observedAt: string;
  confidence: number;
  priorityWeight: number;
  duplicateOf: string | null;
  projectId: string | null;
  payload: EnterpriseSignalPayload;
};

export type IngestionAdapter = { source: SignalSource; mapEvent: (event: Record<string, unknown>) => EnterpriseOperationalSignal };

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function normalizeSignals(signals: EnterpriseOperationalSignal[]): EnterpriseOperationalSignal[] {
  const seen = new Map<string, string>();
  return [...signals]
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .map((signal) => {
      const fingerprint = `${signal.source}:${signal.sourceEventId}:${signal.category}`;
      const duplicateOf = seen.get(fingerprint) ?? null;
      if (!duplicateOf) seen.set(fingerprint, signal.signalId);
      return { ...signal, duplicateOf, confidence: clamp(signal.confidence), priorityWeight: clamp(signal.priorityWeight) };
    });
}

export type OperationalTimelineEvent = EnterpriseOperationalSignal & { sequence: number; heartbeat: boolean };

export type OperationalTimelineStore = {
  generatedAt: string;
  events: OperationalTimelineEvent[];
  escalationChain: { signalId: string; from: string; to: string; reason: string }[];
  interventions: { interventionId: string; signalIds: string[]; outcome: "pending" | "stabilized" | "failed"; rationale: string }[];
};

export function buildTimelineStore(signals: EnterpriseOperationalSignal[]): OperationalTimelineStore {
  const normalized = normalizeSignals(signals);
  const events = normalized.map((event, idx) => ({ ...event, sequence: idx + 1, heartbeat: idx % 3 === 0 }));
  const escalationChain = events
    .filter((event): event is OperationalTimelineEvent & { payload: EscalationSignal } => event.payload.type === "escalation_signal")
    .map((event) => ({ signalId: event.signalId, from: event.payload.from, to: event.payload.to, reason: event.payload.reason }));

  // Build interventions only from signals that have cleared the priority weight threshold
  const highPrioritySignalIds = events.filter((e) => e.priorityWeight >= 70).map((e) => e.signalId);
  const escalationSignalIds = events.filter((e) => e.payload.type === "escalation_signal").map((e) => e.signalId);
  const interventionSignalIds = [...new Set([...escalationSignalIds, ...highPrioritySignalIds])];

  const interventions = interventionSignalIds.length > 0
    ? [{
        interventionId: "intv-primary",
        signalIds: interventionSignalIds,
        outcome: "pending" as const,
        rationale: [
          escalationSignalIds.length > 0 ? "escalation signal detected" : null,
          highPrioritySignalIds.length > 0 ? `${highPrioritySignalIds.length} high-priority signal(s) above weight threshold` : null,
        ].filter(Boolean).join("; "),
      }]
    : [];

  return {
    generatedAt: new Date().toISOString(),
    events,
    escalationChain,
    interventions,
  };
}

export function buildOperationalGraph(store: OperationalTimelineStore) {
  const nodes = new Set<string>();
  const edges: Array<{ from: string; to: string; type: "stakeholder" | "escalation" | "dependency" | "delivery" | "bottleneck" }> = [];
  for (const esc of store.escalationChain) {
    nodes.add(esc.from); nodes.add(esc.to);
    edges.push({ from: esc.from, to: esc.to, type: "escalation" });
  }
  return { nodes: [...nodes], edges };
}

export const JiraAdapter: IngestionAdapter = { source: "jira", mapEvent: (event) => ({ signalId: `jira-${String(event.id ?? "unknown")}`, source: "jira", sourceEventId: String(event.id ?? "unknown"), category: "blocker", timestamp: String(event.timestamp ?? new Date().toISOString()), observedAt: new Date().toISOString(), confidence: 78, priorityWeight: 72, duplicateOf: null, projectId: String(event.projectId ?? "") || null, payload: { type: "jira_event", issueKey: String(event.issueKey ?? "JIRA-UNKNOWN"), action: "updated" } }) };
export const SlackAdapter: IngestionAdapter = { source: "slack", mapEvent: (event) => ({ signalId: `slack-${String(event.id ?? "unknown")}`, source: "slack", sourceEventId: String(event.id ?? "unknown"), category: "communication", timestamp: String(event.timestamp ?? new Date().toISOString()), observedAt: new Date().toISOString(), confidence: 66, priorityWeight: 50, duplicateOf: null, projectId: String(event.projectId ?? "") || null, payload: { type: "slack_event", channel: String(event.channel ?? "general"), action: "thread_escalation" } }) };
export const TeamsAdapter: IngestionAdapter = { source: "teams", mapEvent: (event) => ({ signalId: `teams-${String(event.id ?? "unknown")}`, source: "teams", sourceEventId: String(event.id ?? "unknown"), category: "communication", timestamp: String(event.timestamp ?? new Date().toISOString()), observedAt: new Date().toISOString(), confidence: 64, priorityWeight: 52, duplicateOf: null, projectId: String(event.projectId ?? "") || null, payload: { type: "teams_event", team: String(event.team ?? "delivery"), action: "escalation" } }) };
export const GitHubAdapter: IngestionAdapter = { source: "github", mapEvent: (event) => ({ signalId: `github-${String(event.id ?? "unknown")}`, source: "github", sourceEventId: String(event.id ?? "unknown"), category: "deployment", timestamp: String(event.timestamp ?? new Date().toISOString()), observedAt: new Date().toISOString(), confidence: 81, priorityWeight: 74, duplicateOf: null, projectId: String(event.projectId ?? "") || null, payload: { type: "github_event", repo: String(event.repo ?? "unknown"), action: "deployment_failed" } }) };

export function buildMockOperationalIntelligence(projectId: string | null) {
  const now = new Date();
  // Signals use template IDs — this is a structural simulation, not real integration data.
  const raw = [
    JiraAdapter.mapEvent({ id: "sim-jira-1", issueKey: "SIM-001", timestamp: new Date(now.getTime() - 20 * 60000).toISOString(), projectId }),
    SlackAdapter.mapEvent({ id: "sim-slack-1", channel: "#simulated-channel", timestamp: new Date(now.getTime() - 15 * 60000).toISOString(), projectId }),
    TeamsAdapter.mapEvent({ id: "sim-teams-1", team: "Simulated Team", timestamp: new Date(now.getTime() - 12 * 60000).toISOString(), projectId }),
    GitHubAdapter.mapEvent({ id: "sim-github-1", repo: "simulated-repo", timestamp: new Date(now.getTime() - 8 * 60000).toISOString(), projectId }),
  ];
  const timeline = buildTimelineStore(raw);
  const graph = buildOperationalGraph(timeline);
  const recommendationQueue = [
    "[SIMULATED] Assign owner and deadline to oldest active blocker",
    "[SIMULATED] Escalate to delivery manager if blocker age exceeds 5 days",
    "[SIMULATED] Reset sponsor confidence checkpoint within 24h",
    "[SIMULATED] Enforce deterministic 4-hour execution heartbeat",
  ];
  return {
    simulationMode: true,
    simulationNote: "Live operational telemetry requires active integrations (Jira, Slack, Teams, GitHub). This response contains simulated structural data only.",
    rawSignals: raw,
    timeline,
    graph,
    recommendationQueue,
    whyIntervened: timeline.interventions.map((i) => ({
      ...i,
      sourceSignals: i.signalIds,
      escalationChain: timeline.escalationChain,
      triggeringConditions: ["priority weight > 70", "escalation chain active"],
      dependencyContext: graph.edges,
      coordinationRationale: i.rationale,
      operationalConfidence: 76,
    })),
    architecturePlaceholders: ["websocket_infra", "agent_coordination", "autonomous_pm_agents", "org_wide_operational_graphs", "cross_project_telemetry"],
  };
}

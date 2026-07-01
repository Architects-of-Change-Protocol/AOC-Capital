export type OperationalMemoryScope = {
  companyId: string;
  workspaceId: string | null;
  projectId: string | null;
  conversationId?: string | null;
  interventionId?: string | null;
  stakeholderId?: string | null;
  eventId?: string | null;
};

export type OperationalMemoryRecordType =
  | "blocker"
  | "risk"
  | "escalation"
  | "decision"
  | "commitment"
  | "dependency"
  | "stakeholder_signal"
  | "delivery_pressure"
  | "governance_gap"
  | "timeline_signal"
  | "intervention"
  | "recovery";

export type OperationalResolutionStatus =
  | "unresolved"
  | "in_progress"
  | "resolved"
  | "escalated"
  | "abandoned";

export type OperationalLineageType =
  | "caused_by"
  | "triggers"
  | "blocks"
  | "escalates_to"
  | "resolved_by"
  | "depends_on"
  | "related_to";

export type OperationalIngestionSource =
  | "chat_conversation"
  | "operational_summary"
  | "uploaded_document"
  | "ai_intervention"
  | "manual_note"
  | "escalation_event"
  | "governance_event"
  | "connector_signal";

export type OperationalMemoryWeights = {
  continuityWeight: number;
  operationalPressureWeight: number;
  escalationWeight: number;
  unresolvedWeight: number;
  deliveryImpactWeight: number;
};

export type OperationalMemoryRecord = {
  id: string;
  recordType: OperationalMemoryRecordType;
  summary: string;
  detail: string | null;
  scope: OperationalMemoryScope;
  parentRecordId: string | null;
  lineageType: OperationalLineageType | null;
  resolutionStatus: OperationalResolutionStatus;
  weights: OperationalMemoryWeights;
  confidence: number;
  ingestionSource: OperationalIngestionSource;
  sourceRef: string | null;
  nutrientIds: string[];
  interventionCount: number;
  firstObservedAt: string;
  lastObservedAt: string;
  resolvedAt: string | null;
  createdAt: string;
};

export type OperationalContinuityRecord = {
  id: string;
  scope: OperationalMemoryScope;
  continuityStatus: "active" | "degraded" | "gap" | "stale";
  lastActivityAt: string;
  activeBlockerCount: number;
  unresolvedRiskCount: number;
  activeEscalationCount: number;
  pendingCommitmentCount: number;
  continuityScore: number;
  lastReconstructedAt: string;
  createdAt: string;
};

export type OperationalInterventionRecord = {
  id: string;
  memoryRecordId: string;
  scope: OperationalMemoryScope;
  interventionType:
    | "escalation"
    | "blocker_resolution"
    | "stakeholder_engagement"
    | "process_change"
    | "dependency_resolution"
    | "governance_action";
  description: string;
  attemptedAt: string;
  outcome: "succeeded" | "failed" | "partial" | "pending" | "abandoned";
  resolvedAt: string | null;
  failureReason: string | null;
  actorRef: string | null;
  createdAt: string;
};

export type OperationalDecisionRecord = {
  id: string;
  memoryRecordId: string;
  scope: OperationalMemoryScope;
  decisionText: string;
  madeBy: string | null;
  madeAt: string;
  rationale: string | null;
  impactedRecordIds: string[];
  reversible: boolean;
  createdAt: string;
};

export type OperationalCommitmentRecord = {
  id: string;
  memoryRecordId: string;
  scope: OperationalMemoryScope;
  commitmentText: string;
  owner: string | null;
  dueDate: string | null;
  status: "pending" | "fulfilled" | "breached" | "deferred";
  createdAt: string;
};

export type OperationalRiskSignal = {
  signalType: "risk";
  riskCategory: "delivery" | "financial" | "governance" | "stakeholder" | "technical" | "timeline";
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  confidence: number;
  sourceRef: string;
  timestamp: string;
  lineageMemoryRecordId: string | null;
  retrievalWeight: number;
};

export type OperationalPressureSignal = {
  signalType: "pressure";
  pressureSource:
    | "unresolved_blocker"
    | "pending_escalation"
    | "silent_stakeholder"
    | "procurement_delay"
    | "approval_gap"
    | "timeline_compression"
    | "hidden_dependency";
  intensity: "low" | "medium" | "high" | "critical";
  summary: string;
  confidence: number;
  sourceRef: string;
  timestamp: string;
  ageDays: number;
  unresolvedWeight: number;
  lineageMemoryRecordId: string | null;
};

export type OperationalStakeholderSignal = {
  signalType: "stakeholder";
  stakeholderRef: string;
  engagementStatus: "active" | "disengaged" | "silent" | "escalated" | "unavailable";
  lastContactDate: string | null;
  criticalPath: boolean;
  summary: string;
  confidence: number;
  sourceRef: string;
  timestamp: string;
  lineageMemoryRecordId: string | null;
};

export type OperationalDependencySignal = {
  signalType: "dependency";
  dependencyType: "internal" | "external" | "vendor" | "upstream" | "downstream";
  summary: string;
  status: "pending" | "blocked" | "resolved" | "at_risk";
  confidence: number;
  sourceRef: string;
  timestamp: string;
  lineageMemoryRecordId: string | null;
};

export type OperationalEscalationSignal = {
  signalType: "escalation";
  escalationLevel: "team" | "management" | "executive" | "external";
  summary: string;
  status: "pending" | "in_progress" | "resolved" | "abandoned";
  confidence: number;
  sourceRef: string;
  timestamp: string;
  lineageMemoryRecordId: string | null;
};

export type OperationalTimelineSignal = {
  signalType: "timeline";
  timelineEvent:
    | "deadline_approaching"
    | "milestone_at_risk"
    | "schedule_drift"
    | "date_conflict"
    | "delivery_delay";
  summary: string;
  targetDate: string | null;
  confidence: number;
  sourceRef: string;
  timestamp: string;
  lineageMemoryRecordId: string | null;
};

export type OperationalSignal =
  | OperationalRiskSignal
  | OperationalPressureSignal
  | OperationalStakeholderSignal
  | OperationalDependencySignal
  | OperationalEscalationSignal
  | OperationalTimelineSignal;

export type OperationalMemoryIngestionInput = {
  scope: OperationalMemoryScope;
  source: OperationalIngestionSource;
  content: string;
  context?: {
    conversationState?: Record<string, unknown> | null;
    runtimeResponse?: Record<string, unknown> | null;
    actorRef?: string | null;
    parentMemoryRecordId?: string | null;
    lineageType?: OperationalLineageType | null;
    sourceRef?: string | null;
  };
};

export type OperationalMemoryIngestionResult = {
  status: "skipped" | "ingested" | "failed";
  reason?: string;
  recordsCreated: number;
  signalCount: number;
  memoryRecordIds: string[];
};

export type OperationalTimelineEvent = {
  eventId: string;
  eventType: OperationalMemoryRecordType;
  summary: string;
  timestamp: string;
  scope: OperationalMemoryScope;
  parentEventId: string | null;
  lineageType: OperationalLineageType | null;
  resolutionStatus: OperationalResolutionStatus;
  interventions: OperationalInterventionRecord[];
  weights: OperationalMemoryWeights;
};

export type OperationalTimeline = {
  scope: OperationalMemoryScope;
  events: OperationalTimelineEvent[];
  unresolvedCount: number;
  resolvedCount: number;
  activeBlockers: string[];
  activeEscalations: string[];
  pendingCommitments: string[];
  continuityGaps: string[];
  reconstructedAt: string;
};

export type OperationalCausalityChain = {
  rootRecordId: string;
  chain: Array<{
    recordId: string;
    recordType: OperationalMemoryRecordType;
    summary: string;
    lineageType: OperationalLineageType | null;
    resolutionStatus: OperationalResolutionStatus;
    depth: number;
  }>;
  totalDepth: number;
  unresolved: boolean;
};

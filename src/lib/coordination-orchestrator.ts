import type { ExecutionRiskSnapshot } from "@/lib/execution-risk";
import type { InterventionSnapshot } from "@/lib/intervention-engine";
import type { ProjectMemorySnapshot } from "@/lib/memory/organization-memory";
import type { StakeholderRelationshipSnapshot } from "@/lib/stakeholder-intelligence";
import { type CoordinationCollapseRisk } from "@/lib/cross-signal-reasoning";

export type CoordinationPriority = "critical" | "high" | "medium" | "low";
export type CoordinationActionType =
  | "executive_escalation"
  | "stakeholder_alignment"
  | "delivery_recovery"
  | "blocker_resolution"
  | "executive_communication";
export type CoordinationActionStatus = "queued" | "blocked" | "ready" | "in_progress" | "completed";
export type CoordinationTarget = "project_lead" | "delivery_manager" | "sponsor" | "executive" | "portfolio_office";

export type CoordinationExecutionWindow = {
  startInHours: number;
  dueInHours: number;
  label: "immediate" | "today" | "next_24h" | "next_72h";
};

export type CoordinationDependency = {
  actionId: string;
  reason: string;
  resolved: boolean;
};

export type CoordinationRecommendation = {
  actionId: string;
  type: CoordinationActionType;
  status: CoordinationActionStatus;
  urgency: number;
  priority: CoordinationPriority;
  dependencyChain: CoordinationDependency[];
  escalationPath: CoordinationTarget[];
  targetStakeholder: CoordinationTarget;
  coordinationSequence: string[];
  recommendedExecutionOrder: number;
  executionWindow: CoordinationExecutionWindow;
  confidenceRationale: string;
  commentary: string;
};

export type CoordinationQueue = {
  generatedAt: string;
  actions: CoordinationRecommendation[];
};

export type EscalationWorkflow = {
  sequence: CoordinationActionType[];
  escalationPath: CoordinationTarget[];
  dependencyResolved: boolean;
  deadlockRisk: "none" | "watch" | "high";
  commentary: string[];
};

export type InterventionWorkflow = {
  type: "stakeholder_alignment" | "delivery_recovery" | "blocker_resolution" | "executive_communication";
  sequence: string[];
  blockedBy: string[];
  ready: boolean;
  commentary: string[];
};

export type OperationalCoordinationSnapshot = {
  projectId: string | null;
  workspaceId: string | null;
  generatedAt: string;
  operational_priority_queue: CoordinationQueue;
  escalation_sequence: EscalationWorkflow;
  coordination_conflict_risk: { level: "none" | "watch" | "high"; conflicts: string[] };
  execution_recovery_path: InterventionWorkflow;
  dependency_deadlock_risk: { level: "none" | "watch" | "high"; deadlocks: string[] };
  stakeholder_alignment_sequence: InterventionWorkflow;
  escalation_overload_risk: { level: "none" | "watch" | "high"; competingEscalations: number; commentary: string };
  coordination_collapse_risk: CoordinationCollapseRisk;
  machineOutput: {
    coordination_urgency: CoordinationPriority;
    dependency_collision_count: number;
    escalation_competition_count: number;
    queue_size: number;
  };
  commentary: string[];
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const toPriority = (urgency: number): CoordinationPriority => (urgency >= 85 ? "critical" : urgency >= 65 ? "high" : urgency >= 40 ? "medium" : "low");
const toWindow = (urgency: number): CoordinationExecutionWindow => {
  if (urgency >= 85) return { startInHours: 0, dueInHours: 6, label: "immediate" };
  if (urgency >= 65) return { startInHours: 0, dueInHours: 24, label: "today" };
  if (urgency >= 40) return { startInHours: 4, dueInHours: 24, label: "next_24h" };
  return { startInHours: 24, dueInHours: 72, label: "next_72h" };
};

const dependencyResolved = (deps: CoordinationDependency[]) => deps.every((dep) => dep.resolved);

export function buildEscalationWorkflow(queue: CoordinationQueue): EscalationWorkflow {
  const escalationActions = queue.actions.filter((action) => action.type === "executive_escalation" || action.type === "executive_communication");
  const hasUnresolved = escalationActions.some((action) => !dependencyResolved(action.dependencyChain));
  const deadlockRisk: EscalationWorkflow["deadlockRisk"] = escalationActions.length >= 2 && hasUnresolved ? "high" : hasUnresolved ? "watch" : "none";

  return {
    sequence: escalationActions.map((action) => action.type),
    escalationPath: escalationActions.flatMap((action) => action.escalationPath),
    dependencyResolved: !hasUnresolved,
    deadlockRisk,
    commentary: [
      hasUnresolved ? "escalation dependency unresolved" : "escalation pathway dependencies resolved",
      escalationActions.length >= 2 ? "multiple escalations competing simultaneously" : "single escalation lane active",
    ],
  };
}

export function buildStakeholderAlignmentWorkflow(queue: CoordinationQueue): InterventionWorkflow {
  const action = queue.actions.find((item) => item.type === "stakeholder_alignment");
  const blockedBy = action?.dependencyChain.filter((dep) => !dep.resolved).map((dep) => dep.reason) ?? [];
  return {
    type: "stakeholder_alignment",
    sequence: action?.coordinationSequence ?? ["map stakeholder decisions", "sequence communication order", "confirm approvals"],
    blockedBy,
    ready: blockedBy.length === 0,
    commentary: [
      blockedBy.length > 0 ? "stakeholder alignment dependency unresolved" : "stakeholder alignment pathway clear",
      "stakeholder communication order matters",
    ],
  };
}

export function buildDeliveryRecoveryWorkflow(queue: CoordinationQueue): InterventionWorkflow {
  const action = queue.actions.find((item) => item.type === "delivery_recovery");
  const blockedBy = action?.dependencyChain.filter((dep) => !dep.resolved).map((dep) => dep.reason) ?? [];
  return {
    type: "delivery_recovery",
    sequence: action?.coordinationSequence ?? ["stabilize execution cadence", "resolve blockers", "re-baseline milestone"],
    blockedBy,
    ready: blockedBy.length === 0,
    commentary: [blockedBy.length > 0 ? "execution recovery blocked by unresolved coordination chain" : "delivery stabilization sequence required"],
  };
}

export function buildBlockerResolutionWorkflow(queue: CoordinationQueue): InterventionWorkflow {
  const action = queue.actions.find((item) => item.type === "blocker_resolution");
  const blockedBy = action?.dependencyChain.filter((dep) => !dep.resolved).map((dep) => dep.reason) ?? [];
  return {
    type: "blocker_resolution",
    sequence: action?.coordinationSequence ?? ["rank blockers", "assign owners", "track closure checkpoints"],
    blockedBy,
    ready: blockedBy.length === 0,
    commentary: [blockedBy.length > 0 ? "critical blocker requires executive escalation before delivery recovery" : "blocker resolution pathway is actionable"],
  };
}

export function buildExecutiveCommunicationWorkflow(queue: CoordinationQueue): InterventionWorkflow {
  const action = queue.actions.find((item) => item.type === "executive_communication");
  return {
    type: "executive_communication",
    sequence: action?.coordinationSequence ?? ["prepare executive brief", "confirm ask", "issue aligned communication"],
    blockedBy: action?.dependencyChain.filter((dep) => !dep.resolved).map((dep) => dep.reason) ?? [],
    ready: Boolean(action),
    commentary: ["executive communication sequence enforces deterministic escalation ordering"],
  };
}

export function detectDependencyCollisions(queue: CoordinationQueue): string[] {
  const unresolved = queue.actions.flatMap((action) => action.dependencyChain.filter((dep) => !dep.resolved).map((dep) => `${action.actionId}:${dep.reason}`));
  return unresolved.filter((item, index) => unresolved.indexOf(item) !== index || unresolved.length >= 2);
}

export function detectEscalationDeadlocks(queue: CoordinationQueue): string[] {
  const escalationActions = queue.actions.filter((action) => action.type === "executive_escalation" || action.type === "executive_communication");
  return escalationActions
    .filter((action) => action.status === "blocked" || action.dependencyChain.some((dep) => !dep.resolved))
    .map((action) => `${action.type} blocked by unresolved dependency`);
}

export function detectCoordinationConflicts(queue: CoordinationQueue): string[] {
  const conflicts: string[] = [];
  const escalationCount = queue.actions.filter((action) => action.type === "executive_escalation").length;
  if (escalationCount >= 2) conflicts.push("multiple escalations competing simultaneously");
  if (queue.actions.filter((action) => action.status === "blocked").length >= 2) conflicts.push("PM intervention overloaded");
  if (queue.actions.some((action) => action.type === "delivery_recovery" && action.status === "blocked")) conflicts.push("execution recovery blocked by unresolved coordination chain");
  return conflicts;
}

export function prioritizeOperationalActions(input: {
  executionRisk: ExecutionRiskSnapshot;
  stakeholderIntelligence: StakeholderRelationshipSnapshot;
  interventionIntelligence: InterventionSnapshot;
  organizationalMemory: ProjectMemorySnapshot | null;
}): CoordinationQueue {
  const blockers = input.organizationalMemory?.project.blockers.length ?? 0;
  const unresolvedDecisions = input.organizationalMemory?.decisions.filter((decision) => decision.unresolvedConsequences.length > 0).length ?? 0;

  const actions: CoordinationRecommendation[] = [
    {
      actionId: "stakeholder_alignment",
      type: "stakeholder_alignment",
      status: input.stakeholderIntelligence.stakeholderAlignment === "fragmented" ? "blocked" : "ready",
      urgency: clamp((input.stakeholderIntelligence.politicalRisk === "critical" ? 90 : input.stakeholderIntelligence.politicalRisk === "high" ? 75 : 50) + unresolvedDecisions * 5),
      priority: "medium",
      dependencyChain: [{ actionId: "executive_communication", reason: "pending decision owner alignment", resolved: unresolvedDecisions === 0 }],
      escalationPath: ["project_lead", "sponsor"],
      targetStakeholder: "sponsor",
      coordinationSequence: ["map decision owners", "resolve stakeholder dependency", "confirm communication order"],
      recommendedExecutionOrder: 0,
      executionWindow: { startInHours: 0, dueInHours: 24, label: "today" },
      confidenceRationale: "Deterministic stakeholder alignment score derived from pressure, escalation, and decision authority signals.",
      commentary: "stakeholder alignment dependency unresolved",
    },
    {
      actionId: "delivery_recovery",
      type: "delivery_recovery",
      status: input.interventionIntelligence.executionDeadlock ? "blocked" : "ready",
      urgency: clamp(input.interventionIntelligence.deliveryBreakdownRisk),
      priority: "medium",
      dependencyChain: [{ actionId: "blocker_resolution", reason: "top blockers unresolved", resolved: blockers === 0 }],
      escalationPath: ["delivery_manager", "sponsor"],
      targetStakeholder: "delivery_manager",
      coordinationSequence: ["stabilize delivery cadence", "sequence recovery tasks", "publish recovery checkpoint"],
      recommendedExecutionOrder: 0,
      executionWindow: { startInHours: 0, dueInHours: 24, label: "today" },
      confidenceRationale: "Delivery recovery urgency is computed from deterministic breakdown risk and execution deadlock detection.",
      commentary: "delivery stabilization sequence required",
    },
    {
      actionId: "blocker_resolution",
      type: "blocker_resolution",
      status: blockers >= 3 ? "ready" : "queued",
      urgency: clamp(blockers * 20 + (input.executionRisk.activeEscalationRisk === "immediate" ? 20 : 0)),
      priority: "medium",
      dependencyChain: [{ actionId: "executive_escalation", reason: "critical blocker requires escalation if unresolved after owner checkpoint", resolved: blockers < 3 }],
      escalationPath: ["project_lead", "delivery_manager"],
      targetStakeholder: "project_lead",
      coordinationSequence: ["rank blocker chain", "assign owners and due times", "verify blocker closures"],
      recommendedExecutionOrder: 0,
      executionWindow: { startInHours: 0, dueInHours: 6, label: "immediate" },
      confidenceRationale: "Blocker urgency is a deterministic function of blocker volume and escalation severity.",
      commentary: "critical blocker requires executive escalation before delivery recovery",
    },
    {
      actionId: "executive_escalation",
      type: "executive_escalation",
      status: input.interventionIntelligence.escalationProbability >= 70 ? "ready" : "queued",
      urgency: clamp(input.interventionIntelligence.escalationProbability),
      priority: "medium",
      dependencyChain: [{ actionId: "stakeholder_alignment", reason: "alignment checkpoint incomplete", resolved: input.stakeholderIntelligence.executiveAlignment === "aligned" }],
      escalationPath: ["sponsor", "executive", "portfolio_office"],
      targetStakeholder: "executive",
      coordinationSequence: ["confirm escalation trigger", "package objective evidence", "issue executive escalation"],
      recommendedExecutionOrder: 0,
      executionWindow: { startInHours: 0, dueInHours: 6, label: "immediate" },
      confidenceRationale: "Escalation probability is a deterministic weighted blend of instability, drift, and deadlock signals.",
      commentary: "escalation dependency unresolved",
    },
    {
      actionId: "executive_communication",
      type: "executive_communication",
      status: "queued",
      urgency: clamp((input.stakeholderIntelligence.executivePressure === "critical" ? 85 : 55) + unresolvedDecisions * 4),
      priority: "medium",
      dependencyChain: [{ actionId: "executive_escalation", reason: "escalation evidence package not finalized", resolved: input.interventionIntelligence.escalationProbability < 70 }],
      escalationPath: ["sponsor", "executive"],
      targetStakeholder: "executive",
      coordinationSequence: ["draft deterministic executive update", "sequence communication with sponsor", "send executive communication"],
      recommendedExecutionOrder: 0,
      executionWindow: { startInHours: 0, dueInHours: 24, label: "today" },
      confidenceRationale: "Executive communication urgency is derived from executive pressure and unresolved decision volume.",
      commentary: "stakeholder communication order matters",
    },
  ];

  const prioritized = actions
    .map((action) => {
      const urgency = action.urgency;
      return { ...action, urgency, priority: toPriority(urgency), executionWindow: toWindow(urgency) };
    })
    .sort((a, b) => b.urgency - a.urgency)
    .map((action, index) => ({ ...action, recommendedExecutionOrder: index + 1 }));

  return { generatedAt: new Date().toISOString(), actions: prioritized };
}

export function buildOperationalCoordinationSnapshot(input: {
  projectId: string | null;
  workspaceId: string | null;
  executionRisk: ExecutionRiskSnapshot;
  stakeholderIntelligence: StakeholderRelationshipSnapshot;
  interventionIntelligence: InterventionSnapshot;
  organizationalMemory: ProjectMemorySnapshot | null;
  timelineIntelligence: { daysSinceUpdate: number; stale: boolean };
}): OperationalCoordinationSnapshot {
  const queue = prioritizeOperationalActions(input);
  const dependencyCollisions = detectDependencyCollisions(queue);
  const escalationDeadlocks = detectEscalationDeadlocks(queue);
  const conflicts = detectCoordinationConflicts(queue);
  const alignmentWorkflow = buildStakeholderAlignmentWorkflow(queue);
  const recoveryWorkflow = buildDeliveryRecoveryWorkflow(queue);
  const escalationSequence = buildEscalationWorkflow(queue);

  // Coordination collapse: escalation snapshot already computed this; surface it here
  // so the coordination layer can act on it with appropriate urgency escalation.
  const coordinationCollapse = input.interventionIntelligence.coordinationCollapse;

  // Only count escalation actions that have actually crossed the urgency threshold (>=65);
  // having the action type in the queue doesn't constitute overload if urgency is low
  const competingEscalations = queue.actions.filter((a) => (a.type === "executive_escalation" || a.type === "executive_communication") && a.urgency >= 65).length;
  const overloadRisk: OperationalCoordinationSnapshot["escalation_overload_risk"] = {
    level: competingEscalations >= 2 ? "high" : competingEscalations === 1 ? "watch" : "none",
    competingEscalations,
    commentary: competingEscalations >= 2 ? "multiple high-urgency escalations competing simultaneously" : "escalation load is contained",
  };

  const coordinationUrgency = queue.actions[0]?.priority ?? "low";

  const collapseCommentary =
    coordinationCollapse.level === "critical"
      ? `CRITICAL: Coordination collapse risk detected — ${coordinationCollapse.collapsePatterns[0] ?? "multiple breakdown patterns converging"}. Immediate executive intervention required.`
      : coordinationCollapse.level === "elevated"
        ? `Coordination fragility elevated — ${coordinationCollapse.description}`
        : null;

  return {
    projectId: input.projectId,
    workspaceId: input.workspaceId,
    generatedAt: new Date().toISOString(),
    operational_priority_queue: queue,
    escalation_sequence: escalationSequence,
    coordination_conflict_risk: { level: conflicts.length >= 2 ? "high" : conflicts.length === 1 ? "watch" : "none", conflicts },
    execution_recovery_path: recoveryWorkflow,
    dependency_deadlock_risk: { level: escalationDeadlocks.length >= 2 ? "high" : escalationDeadlocks.length === 1 ? "watch" : "none", deadlocks: escalationDeadlocks },
    stakeholder_alignment_sequence: alignmentWorkflow,
    escalation_overload_risk: overloadRisk,
    coordination_collapse_risk: coordinationCollapse,
    machineOutput: {
      coordination_urgency: coordinationUrgency,
      dependency_collision_count: dependencyCollisions.length,
      escalation_competition_count: competingEscalations,
      queue_size: queue.actions.length,
    },
    commentary: [
      ...(collapseCommentary ? [collapseCommentary] : []),
      recoveryWorkflow.blockedBy.length > 0 ? "Execution recovery is blocked by unresolved stakeholder dependency." : "Delivery recovery requires coordination stabilization before escalation.",
      conflicts.includes("multiple escalations competing simultaneously")
        ? "Escalation path collision detected between operational and executive workflows."
        : "Escalation pathways are currently serialized.",
      "Intervention ordering matters. Incorrect escalation sequence may destabilize alignment.",
      queue.actions.filter((action) => action.status === "blocked").length >= 2 ? "Operational coordination overload detected." : "Coordination load remains manageable.",
      input.timelineIntelligence.stale ? "Timeline intelligence indicates stale execution updates; intervention sequencing should start immediately." : "Timeline signal is fresh enough for deterministic orchestration.",
    ],
  };
}

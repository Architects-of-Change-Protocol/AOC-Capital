import type { AdaptiveOperationalProfile } from "@/lib/adaptive-operational-intelligence";
import type { OperationalCoordinationSnapshot } from "@/lib/coordination-orchestrator";
import type { InterventionSnapshot } from "@/lib/intervention-engine";

export type RuntimeOperationalPlanType = "delivery_recovery" | "escalation_stabilization" | "stakeholder_alignment" | "dependency_recovery" | "governance_stabilization" | "coordination_recovery" | "executive_alignment" | "custom";
export type RuntimeOperationalPlanStatus = "active" | "watching" | "stabilizing" | "degrading" | "blocked" | "resolved";
export type RuntimeOperationalPlanSeverity = "low" | "moderate" | "high" | "critical";

export type RuntimeOperationalAction = {
  id: string;
  action: string;
  rationale: string;
  priority: number;
  ownerSuggestion?: string;
  dependency?: string;
  escalationTrigger?: string;
  status: "pending" | "watching" | "completed" | "blocked";
};

export type RuntimeOperationalPlan = {
  id: string;
  type: RuntimeOperationalPlanType;
  title: string;
  objective: string;
  status: RuntimeOperationalPlanStatus;
  severity: RuntimeOperationalPlanSeverity;
  confidence: string;
  generatedFrom: string[];
  supportingEvidence: string[];
  operationalSequence: RuntimeOperationalAction[];
  adaptiveUpdates: string[];
  followUpQuestions: string[];
  createdAt: string;
  updatedAt: string;
};

const rankSeverity = (s: RuntimeOperationalPlanSeverity) => ({ low: 1, moderate: 2, high: 3, critical: 4 })[s];
const statusFromSignals = (blocked: boolean, severity: RuntimeOperationalPlanSeverity, improving: boolean): RuntimeOperationalPlanStatus => {
  if (blocked) return "blocked";
  if (improving && rankSeverity(severity) <= 2) return "stabilizing";
  if (rankSeverity(severity) >= 3 && !improving) return "degrading";
  return rankSeverity(severity) <= 2 ? "watching" : "active";
};

export function generateRuntimeOperationalPlans(input: {
  projectId: string | null;
  intervention: InterventionSnapshot;
  coordination: OperationalCoordinationSnapshot;
  adaptiveProfile?: AdaptiveOperationalProfile | null;
  now?: Date;
}): RuntimeOperationalPlan[] {
  const now = input.now ?? new Date();
  const severity: RuntimeOperationalPlanSeverity = input.intervention.interventionUrgency === "critical" ? "critical" : input.intervention.interventionUrgency === "elevated" ? "high" : input.intervention.interventionUrgency === "watch" ? "moderate" : "low";
  const improving = Boolean(input.adaptiveProfile?.patterns.some((p) => p.type === "recovery_pattern" && p.confidence >= 50));
  const escalationTrend = Boolean(input.adaptiveProfile?.patterns.some((p) => p.type === "escalation_trajectory" && p.confidence >= 55));
  const staleSignal = input.intervention.triggers.some((t) => t.key === "no_recent_execution_updates" && t.active);

  const plans: RuntimeOperationalPlan[] = [];
  const addPlan = (plan: Omit<RuntimeOperationalPlan, "createdAt" | "updatedAt">) => plans.push({ ...plan, createdAt: now.toISOString(), updatedAt: now.toISOString() });

  if (input.intervention.recommendedInterventionType === "delivery_recovery" || input.intervention.executionDeadlock) {
    addPlan({
      id: `rop-${input.projectId ?? "workspace"}-delivery-recovery`,
      type: "delivery_recovery",
      title: "Delivery Recovery Plan",
      objective: "Recover execution reliability by resolving blockers and restoring delivery cadence.",
      status: statusFromSignals(input.intervention.executionDeadlock, severity, improving),
      severity,
      confidence: improving ? "moderate-to-high" : "moderate",
      generatedFrom: ["intervention_engine", "coordination_queue", "execution_deadlock"],
      supportingEvidence: input.intervention.triggers.filter((t) => t.active).slice(0, 4).map((t) => t.reason),
      operationalSequence: [
        { id: "dr-1", action: "Clarify accountable owner for top unresolved blocker.", rationale: "Owner ambiguity slows resolution throughput.", priority: 1, ownerSuggestion: "project lead", status: "pending" },
        { id: "dr-2", action: "Isolate critical dependency chain with decision deadlines.", rationale: "Dependency slippage amplifies delivery instability.", priority: 2, ownerSuggestion: "delivery manager", dependency: "dr-1", status: "pending" },
        { id: "dr-3", action: "Escalate unresolved blockers if unchanged after 24h checkpoint.", rationale: "Escalation timing prevents silent degradation.", priority: 3, escalationTrigger: "No blocker delta in next operational cycle", ownerSuggestion: "sponsor", dependency: "dr-2", status: staleSignal ? "blocked" : "pending" },
      ],
      adaptiveUpdates: staleSignal ? ["Plan degraded: no recent execution updates detected; escalation checkpoint tightened."] : improving ? ["Plan stabilizing: recovery pattern detected across recent operational records."] : [],
      followUpQuestions: ["Which blocker has no clear owner right now?", "Which dependency is blocking the next milestone?"],
    });
  }

  if (input.intervention.stakeholderBreakdown || escalationTrend) {
    addPlan({
      id: `rop-${input.projectId ?? "workspace"}-escalation-stabilization`,
      type: "escalation_stabilization",
      title: "Escalation Stabilization Plan",
      objective: "Stabilize escalation pressure with explicit decision asks and timeline alignment.",
      status: statusFromSignals(false, escalationTrend ? "critical" : "high", improving),
      severity: escalationTrend ? "critical" : "high",
      confidence: escalationTrend ? "high" : "moderate",
      generatedFrom: ["stakeholder_pressure", "escalation_trajectory", "intervention_recommendations"],
      supportingEvidence: input.intervention.escalations.slice(0, 2).map((e) => `${e.target}: ${e.reason}`),
      operationalSequence: [
        { id: "es-1", action: "Prepare single escalation summary with unresolved ownership and dependency impacts.", rationale: "Fragmented escalation signals reduce decision quality.", priority: 1, ownerSuggestion: "project lead", status: "pending" },
        { id: "es-2", action: "Define explicit executive decision ask and deadline.", rationale: "Escalation without ask drives repeated pressure cycles.", priority: 2, ownerSuggestion: "sponsor", dependency: "es-1", status: "pending" },
        { id: "es-3", action: "Issue executive briefing aligned to escalation timeline.", rationale: "Timeline alignment prevents competing escalation paths.", priority: 3, ownerSuggestion: "executive reviewer", escalationTrigger: "Pressure increases in next cycle", dependency: "es-2", status: "watching" },
      ],
      adaptiveUpdates: escalationTrend ? ["Plan severity increased because escalation trajectory worsened across recent stakeholder records."] : [],
      followUpQuestions: ["What decision is being asked from executives?", "Who owns the escalation narrative this week?"],
    });
  }

  if (input.coordination.coordination_conflict_risk.level !== "none") {
    addPlan({
      id: `rop-${input.projectId ?? "workspace"}-coordination-recovery`,
      type: "coordination_recovery",
      title: "Coordination Recovery Plan",
      objective: "Restore cross-team flow by sequencing dependency resolution and stakeholder sync loops.",
      status: input.coordination.dependency_deadlock_risk.level === "high" ? "blocked" : "active",
      severity: input.coordination.dependency_deadlock_risk.level === "high" ? "high" : "moderate",
      confidence: "moderate",
      generatedFrom: ["coordination_conflict_risk", "dependency_deadlock_risk", "operational_priority_queue"],
      supportingEvidence: [...input.coordination.coordination_conflict_risk.conflicts, ...input.coordination.dependency_deadlock_risk.deadlocks].slice(0, 4),
      operationalSequence: [
        { id: "cr-1", action: "Run dependency review focused on deadlocked handoffs.", rationale: "Deadlocks block recovery throughput.", priority: 1, ownerSuggestion: "delivery manager", status: "pending" },
        { id: "cr-2", action: "Hold short coordination war-room for unresolved owners.", rationale: "Cross-team silence requires synchronized intervention.", priority: 2, ownerSuggestion: "project lead", dependency: "cr-1", status: "pending" },
        { id: "cr-3", action: "Publish clarified execution sequence and escalation fallback.", rationale: "Explicit sequence reduces repeated coordination friction.", priority: 3, ownerSuggestion: "PMO", dependency: "cr-2", status: "watching" },
      ],
      adaptiveUpdates: input.coordination.dependency_deadlock_risk.level === "high" ? ["Plan is blocked: dependency deadlock risk remains high."] : [],
      followUpQuestions: ["Which dependency pair is causing deadlock?", "Which team has not acknowledged execution order?"],
    });
  }

  return plans.slice(0, 3);
}

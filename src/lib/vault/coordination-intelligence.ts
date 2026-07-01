import type { AdaptiveOperationalConfidence } from "@/lib/vault/adaptive-confidence";
import type { OperationalAttentionSignal } from "@/lib/vault/attention-orchestration";
import type { ContinuitySignal } from "@/lib/vault/continuity-retrieval";
import type { OperationalInterventionRecord } from "@/lib/vault/intervention-memory";
import type { StakeholderResponsivenessProfile } from "@/lib/vault/intervention-efficacy";
import type { LearnedExecutionPatternResult } from "@/lib/vault/learned-execution-patterns";
import type { PrioritizedOperationalMemory } from "@/lib/vault/memory-prioritization";

export const MAX_COORDINATION_NODES = 24;
export const MAX_COORDINATION_EDGES = 32;
export const MAX_COORDINATION_SIGNALS = 12;
export const MAX_COORDINATION_SUMMARIES = 5;
export const MAX_COORDINATION_EVIDENCE = 3;

type Domain = "delivery" | "risk" | "governance" | "stakeholder" | "financial" | "timeline" | "general";
type CoordinationContext = "dependency_chain" | "handoff_friction" | "approval_bottleneck" | "stakeholder_coordination" | "vendor_dependency" | "delivery_flow" | "governance_flow" | "background";

export type CoordinationNode = { nodeId: string; nodeType: "stakeholder" | "team" | "vendor" | "workstream" | "approval" | "dependency" | "delivery_function"; label: string; operationalDomain: Domain; frictionScore: number; unresolvedPressure: number; recurrenceCount: number; lastSeenAt: string; };
export type CoordinationEdge = { edgeId: string; fromNodeId: string; toNodeId: string; relationType: "depends_on" | "blocks" | "requires_approval_from" | "handoff_to" | "escalates_to" | "coordinates_with" | "delays"; handoffFriction: number; dependencyRisk: number; recurrenceCount: number; representativeEvidence: string[]; lastSeenAt: string; };
export type OperationalCoordinationSignal = { signalId: string; coordinationContext: CoordinationContext; coordinationRisk: "critical" | "high" | "moderate" | "low"; bottleneckScore: number; handoffFriction: number; dependencyChainRisk: number; executionFlowStability: number; recoveryPressure: number; affectedNodes: string[]; representativeEvidence: string[]; generatedAt: string; };
export type OperationalCoordinationProfile = { workspaceId: string; projectId: string | null; totalNodes: number; totalEdges: number; criticalCoordinationRisks: number; highCoordinationRisks: number; dominantCoordinationContext: CoordinationContext; overallCoordinationHealth: number; generatedAt: string; };

export type OperationalCoordinationInput = { workspaceId: string; projectId?: string | null; continuitySignals: ContinuitySignal[]; learnedPatterns: LearnedExecutionPatternResult; prioritizedMemory: PrioritizedOperationalMemory[]; attentionSignals: OperationalAttentionSignal[]; interventionHistory: OperationalInterventionRecord[]; adaptiveConfidence?: AdaptiveOperationalConfidence | null; stakeholders: StakeholderResponsivenessProfile[]; maxNodes?: number; maxEdges?: number; maxSignals?: number; };

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const avg = (vals: number[]) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);

const ROLE_CATALOG = [
  { label: "vendor", nodeType: "vendor", domain: "stakeholder" }, { label: "client", nodeType: "stakeholder", domain: "stakeholder" }, { label: "pm", nodeType: "stakeholder", domain: "governance" },
  { label: "technical lead", nodeType: "stakeholder", domain: "delivery" }, { label: "engineering", nodeType: "team", domain: "delivery" }, { label: "logistics", nodeType: "team", domain: "timeline" },
  { label: "approvals", nodeType: "approval", domain: "governance" }, { label: "procurement", nodeType: "team", domain: "financial" }, { label: "finance", nodeType: "team", domain: "financial" },
  { label: "security", nodeType: "team", domain: "risk" }, { label: "implementation", nodeType: "workstream", domain: "delivery" }, { label: "operations", nodeType: "delivery_function", domain: "general" },
  { label: "delivery", nodeType: "workstream", domain: "delivery" }, { label: "stakeholder", nodeType: "stakeholder", domain: "stakeholder" },
] as const;

const contains = (text: string, term: string) => new RegExp(`\\b${term.replace(/\s+/g, "\\s+")}\\b`, "i").test(text);
const norm = (s: string) => s.toLowerCase();

export async function buildCoordinationGraph(input: OperationalCoordinationInput): Promise<{ nodes: CoordinationNode[]; edges: CoordinationEdge[] }> {
  const now = new Date().toISOString();
  const maxNodes = Math.min(MAX_COORDINATION_NODES, input.maxNodes ?? MAX_COORDINATION_NODES);
  const maxEdges = Math.min(MAX_COORDINATION_EDGES, input.maxEdges ?? MAX_COORDINATION_EDGES);
  const nodeMap = new Map<string, CoordinationNode>();
  const evidenceLines = [
    ...input.continuitySignals.map((s) => s.evidenceExcerpt),
    ...input.learnedPatterns.patterns.map((p) => p.explanation),
    ...input.prioritizedMemory.map((m) => `${m.memoryType} ${m.operationalDomain}`),
    ...input.attentionSignals.map((a) => `${a.executionContext} ${a.targetAudience}`),
    ...input.interventionHistory.map((i) => i.interventionText),
  ].map((x) => norm(x || ""));

  for (const line of evidenceLines) {
    for (const role of ROLE_CATALOG) {
      if (!contains(line, role.label)) continue;
      const id = role.label.replace(/\s+/g, "_");
      const existing = nodeMap.get(id);
      if (existing) {
        existing.recurrenceCount += 1;
        existing.lastSeenAt = now;
        continue;
      }
      if (nodeMap.size >= maxNodes) continue;
      nodeMap.set(id, { nodeId: id, nodeType: role.nodeType, label: role.label, operationalDomain: role.domain as Domain, frictionScore: 35, unresolvedPressure: 40, recurrenceCount: 1, lastSeenAt: now });
    }
  }

  if (!nodeMap.size) nodeMap.set("operations", { nodeId: "operations", nodeType: "delivery_function", label: "operations", operationalDomain: "general", frictionScore: 35, unresolvedPressure: 35, recurrenceCount: 1, lastSeenAt: now });
  const nodes = Array.from(nodeMap.values()).slice(0, maxNodes);
  const edgeMap = new Map<string, CoordinationEdge>();
  const nodeIds = nodes.map((n) => n.nodeId);
  const pickPeer = (preferred: string, fallback = "operations") => (nodeIds.includes(preferred) ? preferred : (nodeIds.find((n) => n !== preferred) ?? fallback));

  const addEdge = (fromNodeId: string, toNodeId: string, relationType: CoordinationEdge["relationType"], evidence: string, riskBase = 55, handoffBase = 50) => {
    if (edgeMap.size >= maxEdges || !fromNodeId || !toNodeId || fromNodeId === toNodeId) return;
    const edgeId = `${fromNodeId}:${relationType}:${toNodeId}`;
    const existing = edgeMap.get(edgeId);
    if (existing) {
      existing.recurrenceCount += 1;
      existing.handoffFriction = clamp(Math.round(existing.handoffFriction + 4));
      existing.dependencyRisk = clamp(Math.round(existing.dependencyRisk + 4));
      if (existing.representativeEvidence.length < MAX_COORDINATION_EVIDENCE) existing.representativeEvidence.push(evidence.slice(0, 180));
      existing.lastSeenAt = now;
      return;
    }
    edgeMap.set(edgeId, { edgeId, fromNodeId, toNodeId, relationType, handoffFriction: clamp(handoffBase), dependencyRisk: clamp(riskBase), recurrenceCount: 1, representativeEvidence: [evidence.slice(0, 180)], lastSeenAt: now });
  };

  input.continuitySignals.forEach((signal) => {
    const text = norm(`${signal.type} ${signal.evidenceExcerpt}`);
    const from = pickPeer(text.includes("vendor") ? "vendor" : text.includes("engineering") ? "engineering" : "delivery");
    if (signal.type.includes("dependency") || text.includes("depends") || text.includes("dependency")) addEdge(from, pickPeer("implementation"), "depends_on", signal.evidenceExcerpt, 72, 54);
    if (signal.type.includes("blocker") || text.includes("blocked")) addEdge(from, pickPeer("delivery"), "blocks", signal.evidenceExcerpt, 76, 60);
    if (signal.type.includes("approval") || signal.type.includes("governance") || text.includes("approval")) addEdge(from, pickPeer("approvals"), "requires_approval_from", signal.evidenceExcerpt, 74, 58);
    if (text.includes("escalat")) addEdge(from, pickPeer("pm"), "escalates_to", signal.evidenceExcerpt, 66, 68);
    if (text.includes("stakeholder") || text.includes("client")) addEdge(from, pickPeer("stakeholder"), "coordinates_with", signal.evidenceExcerpt, 62, 62);
    if ((text.includes("handoff") || text.includes("logistics")) && (text.includes("drift") || text.includes("delay"))) addEdge(from, pickPeer("engineering"), "delays", signal.evidenceExcerpt, 71, 73);
  });

  input.interventionHistory.forEach((item) => {
    const text = norm(item.interventionText);
    if (text.includes("handoff") || item.interventionType === "execution_coordination") addEdge(pickPeer("operations"), pickPeer(text.includes("vendor") ? "vendor" : "engineering"), "handoff_to", item.interventionText, 64, item.outcomeStatus === "resolved" ? 44 : 72);
  });

  return { nodes, edges: Array.from(edgeMap.values()).slice(0, maxEdges) };
}

export async function calculateHandoffFriction(input: { edges: CoordinationEdge[]; interventionHistory: OperationalInterventionRecord[]; stakeholders: StakeholderResponsivenessProfile[]; continuitySignals: ContinuitySignal[] }): Promise<number> {
  const failedHandoffs = input.interventionHistory.filter((x) => (x.interventionType === "execution_coordination" || /handoff/i.test(x.interventionText)) && x.outcomeStatus !== "resolved").length;
  const escalations = input.interventionHistory.filter((x) => x.interventionType === "escalation" || x.outcomeStatus === "escalated").length;
  const delayEdges = input.edges.filter((e) => e.relationType === "delays" || e.relationType === "handoff_to");
  const unresolvedSignals = input.continuitySignals.filter((s) => s.unresolved).length;
  const responsiveness = avg(input.stakeholders.map((s) => s.responsivenessScore));
  return clamp(Math.round(failedHandoffs * 8 + escalations * 6 + avg(delayEdges.map((e) => e.handoffFriction)) * 0.35 + unresolvedSignals * 2 + (100 - responsiveness) * 0.2));
}
export async function calculateDependencyChainRisk(input: { edges: CoordinationEdge[]; continuitySignals: ContinuitySignal[]; learnedPatterns: LearnedExecutionPatternResult }): Promise<number> {
  const depEdges = input.edges.filter((e) => e.relationType === "depends_on" || e.relationType === "blocks" || e.relationType === "requires_approval_from");
  const recurringDependency = input.learnedPatterns.patterns.filter((p) => /dependency|approval|vendor|blocker/i.test(p.patternType)).length;
  const timelineDrift = input.continuitySignals.filter((s) => /timeline|delay|drift/i.test(`${s.type} ${s.evidenceExcerpt}`)).length;
  const vendorMentions = input.continuitySignals.filter((s) => /vendor/i.test(s.evidenceExcerpt)).length;
  return clamp(Math.round(avg(depEdges.map((e) => e.dependencyRisk)) * 0.5 + recurringDependency * 7 + timelineDrift * 4 + vendorMentions * 4));
}
export async function calculateCoordinationBottleneckScore(input: { node: CoordinationNode; dependencyChainRisk: number; handoffFriction: number; attentionSignals: OperationalAttentionSignal[]; adaptiveConfidence?: AdaptiveOperationalConfidence | null; stakeholderResponsiveness: number }): Promise<number> {
  const attention = avg(input.attentionSignals.map((a) => a.attentionPriority));
  const confidenceDrop = 100 - (input.adaptiveConfidence?.operationalConfidence ?? 55);
  return clamp(Math.round(input.node.unresolvedPressure * 0.20 + input.node.recurrenceCount * 4 + input.dependencyChainRisk * 0.18 + input.handoffFriction * 0.18 + attention * 0.14 + confidenceDrop * 0.16 + (100 - input.stakeholderResponsiveness) * 0.14));
}
export async function calculateExecutionFlowStability(input: { interventionHistory: OperationalInterventionRecord[]; dependencyChainRisk: number; handoffFriction: number; attentionSignals: OperationalAttentionSignal[]; adaptiveConfidence?: AdaptiveOperationalConfidence | null }): Promise<number> {
  const resolved = input.interventionHistory.filter((x) => x.outcomeStatus === "resolved").length;
  const unresolved = input.interventionHistory.length - resolved;
  const attentionPressure = avg(input.attentionSignals.map((a) => a.operationalPressure));
  const confidence = input.adaptiveConfidence?.executionStability ?? 55;
  return clamp(Math.round(45 + resolved * 4 - unresolved * 3 - input.dependencyChainRisk * 0.22 - input.handoffFriction * 0.18 - attentionPressure * 0.14 + confidence * 0.35));
}
export async function calculateCoordinationRecoveryPressure(input: { coordinationRisk: number; executionFlowStability: number; failedRecoveryInterventions: number; dependencyChainRisk: number }): Promise<number> {
  return clamp(Math.round(input.coordinationRisk * 0.34 + input.failedRecoveryInterventions * 8 + input.dependencyChainRisk * 0.30 + (100 - input.executionFlowStability) * 0.36));
}

export function classifyCoordinationRisk(score: number): OperationalCoordinationSignal["coordinationRisk"] { if (score >= 85) return "critical"; if (score >= 70) return "high"; if (score >= 45) return "moderate"; return "low"; }
export function determineCoordinationContext(input: { dependencyChainRisk: number; handoffFriction: number; approvalPressure: number; stakeholderPressure: number; vendorPressure: number; deliveryBlockers: number; governanceEscalations: number }): CoordinationContext {
  if (input.dependencyChainRisk >= 70) return "dependency_chain";
  if (input.handoffFriction >= 70) return "handoff_friction";
  if (input.approvalPressure >= 65) return "approval_bottleneck";
  if (input.stakeholderPressure >= 65) return "stakeholder_coordination";
  if (input.vendorPressure >= 60) return "vendor_dependency";
  if (input.deliveryBlockers >= 60) return "delivery_flow";
  if (input.governanceEscalations >= 60) return "governance_flow";
  return "background";
}

export function buildCoordinationIntelligenceSummary(signals: OperationalCoordinationSignal[]): string[] {
  const summaries: string[] = [];
  if (signals.some((s) => s.coordinationContext === "vendor_dependency" && s.coordinationRisk !== "low")) summaries.push("Vendor dependency chain is creating delivery bottleneck risk.");
  if (signals.some((s) => s.coordinationContext === "approval_bottleneck" && s.handoffFriction >= 60)) summaries.push("Approval handoff friction is degrading execution flow.");
  if (signals.some((s) => s.coordinationContext === "stakeholder_coordination" && s.coordinationRisk !== "low")) summaries.push("Stakeholder coordination loop remains unresolved.");
  if (signals.some((s) => s.coordinationContext === "delivery_flow" && s.executionFlowStability <= 50)) summaries.push("Delivery flow stability is weak due to repeated dependency failures.");
  if (signals.some((s) => s.coordinationContext === "governance_flow" || s.coordinationContext === "handoff_friction")) summaries.push("Governance handoffs require PM-level coordination attention.");
  if (!summaries.length) summaries.push("Coordination topology remains bounded with background monitoring.");
  return summaries.slice(0, MAX_COORDINATION_SUMMARIES);
}

export async function analyzeOperationalCoordination(input: OperationalCoordinationInput): Promise<{ graph: { nodes: CoordinationNode[]; edges: CoordinationEdge[] }; signals: OperationalCoordinationSignal[]; profile: OperationalCoordinationProfile; summaries: string[] }> {
  const generatedAt = new Date().toISOString();
  try {
    const graph = await buildCoordinationGraph(input);
    const stakeholderResponsiveness = clamp(Math.round(avg(input.stakeholders.map((s) => s.responsivenessScore))));
    const handoffFriction = await calculateHandoffFriction({ edges: graph.edges, interventionHistory: input.interventionHistory, stakeholders: input.stakeholders, continuitySignals: input.continuitySignals });
    const dependencyChainRisk = await calculateDependencyChainRisk({ edges: graph.edges, continuitySignals: input.continuitySignals, learnedPatterns: input.learnedPatterns });
    const executionFlowStability = await calculateExecutionFlowStability({ interventionHistory: input.interventionHistory, dependencyChainRisk, handoffFriction, attentionSignals: input.attentionSignals, adaptiveConfidence: input.adaptiveConfidence });
    const failedRecoveryInterventions = input.interventionHistory.filter((x) => x.outcomeStatus !== "resolved").length;
    const approvalPressure = clamp(Math.round(graph.edges.filter((e) => e.relationType === "requires_approval_from").length * 20));
    const stakeholderPressure = clamp(100 - stakeholderResponsiveness);
    const vendorPressure = clamp(Math.round(graph.nodes.filter((n) => n.nodeType === "vendor").length * 45));
    const deliveryBlockers = clamp(Math.round(graph.edges.filter((e) => e.relationType === "blocks" || e.relationType === "delays").length * 20));
    const governanceEscalations = clamp(Math.round(graph.edges.filter((e) => e.relationType === "escalates_to").length * 28));

    const maxSignals = Math.min(MAX_COORDINATION_SIGNALS, input.maxSignals ?? MAX_COORDINATION_SIGNALS);
    const signals = (await Promise.all(graph.nodes.slice(0, maxSignals).map(async (node, idx) => {
      const bottleneckScore = await calculateCoordinationBottleneckScore({ node, dependencyChainRisk, handoffFriction, attentionSignals: input.attentionSignals, adaptiveConfidence: input.adaptiveConfidence, stakeholderResponsiveness });
      const recoveryPressure = await calculateCoordinationRecoveryPressure({ coordinationRisk: bottleneckScore, executionFlowStability, failedRecoveryInterventions, dependencyChainRisk });
      const context = determineCoordinationContext({ dependencyChainRisk, handoffFriction, approvalPressure, stakeholderPressure, vendorPressure: node.nodeType === "vendor" ? Math.max(vendorPressure, 65) : vendorPressure, deliveryBlockers, governanceEscalations });
      return { signalId: `${node.nodeId}:${idx}`, coordinationContext: context, coordinationRisk: classifyCoordinationRisk(bottleneckScore), bottleneckScore, handoffFriction, dependencyChainRisk, executionFlowStability, recoveryPressure, affectedNodes: [node.nodeId], representativeEvidence: graph.edges.filter((e) => e.fromNodeId === node.nodeId || e.toNodeId === node.nodeId).flatMap((e) => e.representativeEvidence).slice(0, MAX_COORDINATION_EVIDENCE), generatedAt } satisfies OperationalCoordinationSignal;
    }))).slice(0, maxSignals);

    const dominantCoordinationContext = (Object.entries(signals.reduce<Record<CoordinationContext, number>>((acc, item) => { acc[item.coordinationContext] += item.bottleneckScore; return acc; }, { dependency_chain: 0, handoff_friction: 0, approval_bottleneck: 0, stakeholder_coordination: 0, vendor_dependency: 0, delivery_flow: 0, governance_flow: 0, background: 0 })).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "background") as CoordinationContext;
    const overallCoordinationHealth = clamp(Math.round(100 - avg(signals.map((s) => s.bottleneckScore * 0.5 + s.recoveryPressure * 0.2 + (100 - s.executionFlowStability) * 0.3))));
    return { graph, signals, summaries: buildCoordinationIntelligenceSummary(signals), profile: { workspaceId: input.workspaceId, projectId: input.projectId ?? null, totalNodes: graph.nodes.length, totalEdges: graph.edges.length, criticalCoordinationRisks: signals.filter((s) => s.coordinationRisk === "critical").length, highCoordinationRisks: signals.filter((s) => s.coordinationRisk === "high").length, dominantCoordinationContext, overallCoordinationHealth, generatedAt } };
  } catch (error) {
    console.warn("[vault] operational_coordination_intelligence_failed", { workspaceId: input.workspaceId, projectId: input.projectId ?? null, reason: error instanceof Error ? error.message : String(error) });
    const degradedSignal: OperationalCoordinationSignal = { signalId: "degraded:coordination", coordinationContext: "background", coordinationRisk: "low", bottleneckScore: 40, handoffFriction: 42, dependencyChainRisk: 44, executionFlowStability: 48, recoveryPressure: 46, affectedNodes: ["operations"], representativeEvidence: ["coordination analysis degraded; bounded fail-soft fallback engaged"], generatedAt };
    return { graph: { nodes: [{ nodeId: "operations", nodeType: "delivery_function", label: "operations", operationalDomain: "general", frictionScore: 40, unresolvedPressure: 42, recurrenceCount: 1, lastSeenAt: generatedAt }], edges: [] }, signals: [degradedSignal], summaries: ["Operational coordination intelligence degraded; bounded coordination defaults applied."], profile: { workspaceId: input.workspaceId, projectId: input.projectId ?? null, totalNodes: 1, totalEdges: 0, criticalCoordinationRisks: 0, highCoordinationRisks: 0, dominantCoordinationContext: "background", overallCoordinationHealth: 52, generatedAt } };
  }
}

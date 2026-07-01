import type {
  DeploymentEnvironment,
  DeploymentTopology,
  RuntimeTopologyNode,
  RuntimeTopologyEdge,
  TopologyNodeRole,
  TopologyNodeStatus,
} from "../types/production-runtime-types.js";

function buildTopologyNodes(environment: DeploymentEnvironment): RuntimeTopologyNode[] {
  const nodes: Array<{ id: string; role: TopologyNodeRole; status: TopologyNodeStatus; deps: string[] }> = [
    { id: "runtime_core", role: "runtime_core", status: "online", deps: [] },
    { id: "auth_runtime", role: "auth_runtime", status: "online", deps: ["runtime_core"] },
    { id: "governance_runtime", role: "governance_runtime", status: "online", deps: ["auth_runtime"] },
    { id: "operational_memory", role: "operational_memory", status: "online", deps: ["runtime_core", "persistence_layer"] },
    { id: "connector_runtime", role: "connector_runtime", status: "online", deps: ["runtime_core", "governance_runtime"] },
    { id: "federation_runtime", role: "federation_runtime", status: "online", deps: ["connector_runtime"] },
    { id: "onboarding_runtime", role: "onboarding_runtime", status: "online", deps: ["auth_runtime", "operational_memory"] },
    { id: "event_bus", role: "event_bus", status: "online", deps: ["runtime_core"] },
    {
      id: "observability_runtime",
      role: "observability_runtime",
      status: environment === "local" ? "degraded" : "online",
      deps: ["event_bus"],
    },
    { id: "diagnostics_runtime", role: "diagnostics_runtime", status: "online", deps: ["observability_runtime"] },
    { id: "persistence_layer", role: "persistence_layer", status: "online", deps: ["runtime_core"] },
  ];

  return nodes.map((n) => ({
    id: n.id,
    role: n.role,
    status: n.status,
    dependencies: n.deps,
    evidence: [`Node ${n.id} registered for environment ${environment}`],
    uncertainty: ["Live node availability not verified by static topology"],
  }));
}

function buildTopologyEdges(nodes: RuntimeTopologyNode[]): RuntimeTopologyEdge[] {
  const edges: RuntimeTopologyEdge[] = [];
  for (const node of nodes) {
    for (const dep of node.dependencies) {
      edges.push({
        fromNodeId: dep,
        toNodeId: node.id,
        dependencyType: "required",
        evidence: [`${dep} -> ${node.id}: required dependency`],
      });
    }
  }
  return edges;
}

function computeSurvivabilityPropagation(nodes: RuntimeTopologyNode[]): string[] {
  const degraded = nodes.filter((n) => n.status === "degraded" || n.status === "offline");
  if (degraded.length === 0) return ["All topology nodes are online — survivability propagation is minimal."];
  return degraded.map((n) => `Degraded node ${n.id} may propagate instability to dependent services.`);
}

export function buildDeploymentTopologyGraph(environment: DeploymentEnvironment): DeploymentTopology {
  const now = new Date().toISOString();
  const nodes = buildTopologyNodes(environment);
  const edges = buildTopologyEdges(nodes);
  const survivabilityPropagation = computeSurvivabilityPropagation(nodes);

  return {
    environment,
    nodes,
    edges,
    survivabilityPropagation,
    evidence: [
      `${nodes.length} topology nodes registered`,
      `${edges.length} dependency edges mapped`,
      `Environment: ${environment}`,
    ],
    uncertainty: [
      "Topology is a structural representation — live service mesh is not verified",
      "Node status under failure conditions is not evaluated statically",
    ],
    governanceBoundaries: [
      "Topology data must not expose tenant-scoped secrets",
      "Topology access is restricted to authorized operators",
    ],
    checkedAt: now,
  };
}

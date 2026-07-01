import type {
  ConnectorSession,
  LiveConnectorNode,
  LiveConnectorEdge,
  LiveConnectorTopology,
} from "../types/live-federation-types.js";

export function buildLiveConnectorTopology(
  sessions: ConnectorSession[],
  tenantId: string,
  workspaceId: string,
): LiveConnectorTopology {
  const now = new Date().toISOString();

  const nodes: LiveConnectorNode[] = sessions.map((session) => ({
    id: session.id,
    connectorId: session.connectorId,
    provider: session.provider,
    authStatus:
      session.status === "active" && session.tokenState.present
        ? "authenticated"
        : session.status === "degraded"
        ? "degraded"
        : "unauthenticated",
    sessionStatus: session.status,
    tokenEncrypted: session.tokenState.encrypted,
    replayAuthorized: session.status === "active" && session.tokenState.present,
    evidence: [
      `session status: ${session.status}`,
      `token encrypted: ${session.tokenState.encrypted}`,
    ],
    uncertainty: [
      "node auth status reflects session contract — not live provider validation",
    ],
  }));

  const edges: LiveConnectorEdge[] = buildTopologyEdges(nodes);

  const authenticatedCount = nodes.filter((n) => n.authStatus === "authenticated").length;
  const degradedCount = nodes.filter((n) => n.authStatus === "degraded").length;
  const unauthenticatedCount = nodes.filter((n) => n.authStatus === "unauthenticated").length;

  return {
    nodes,
    edges,
    authenticatedCount,
    degradedCount,
    unauthenticatedCount,
    governanceBoundaries: [
      "topology must not expose token values",
      "topology visibility is restricted to authorized operators",
      "topology must be tenant and workspace scoped",
    ],
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    evidence: [
      `total nodes: ${nodes.length}`,
      `authenticated: ${authenticatedCount}`,
      `degraded: ${degradedCount}`,
      `unauthenticated: ${unauthenticatedCount}`,
    ],
    uncertainty: [
      "topology reflects session contract — not live dependency probe",
    ],
    checkedAt: now,
  };
}

function buildTopologyEdges(nodes: LiveConnectorNode[]): LiveConnectorEdge[] {
  const edges: LiveConnectorEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      fromNodeId: nodes[i].id,
      toNodeId: nodes[i + 1].id,
      dependencyType: "optional",
      authRequired: true,
      evidence: ["connector federation topology edge"],
    });
  }
  return edges;
}

import type {
  DeploymentEnvironment,
  RuntimeTopologyNode,
  RuntimeTopologyEdge,
} from "../types/production-runtime-types.js";
import { buildDeploymentTopologyGraph } from "../deployment/deployment-topology.js";

export function retrieveRuntimeTopologyNodes(
  environment: DeploymentEnvironment
): RuntimeTopologyNode[] {
  return buildDeploymentTopologyGraph(environment).nodes;
}

export function retrieveRuntimeTopologyEdges(
  environment: DeploymentEnvironment
): RuntimeTopologyEdge[] {
  return buildDeploymentTopologyGraph(environment).edges;
}

export function buildDependencyMap(
  environment: DeploymentEnvironment
): Map<string, string[]> {
  const nodes = retrieveRuntimeTopologyNodes(environment);
  const map = new Map<string, string[]>();
  for (const node of nodes) {
    map.set(node.id, node.dependencies);
  }
  return map;
}

export function computeTopologyReachability(
  environment: DeploymentEnvironment,
  fromNodeId: string
): string[] {
  const map = buildDependencyMap(environment);
  const visited = new Set<string>();
  const queue = [fromNodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const deps = map.get(current) ?? [];
    queue.push(...deps);
  }

  return [...visited];
}

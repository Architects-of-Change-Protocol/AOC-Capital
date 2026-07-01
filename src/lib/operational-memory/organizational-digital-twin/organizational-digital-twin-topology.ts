import type { OrganizationalDigitalTwinContext } from "./organizational-digital-twin-context";
import type { OrganizationalTopologyGraph } from "./organizational-digital-twin-types";

export function buildOrganizationalTopology(context: OrganizationalDigitalTwinContext): OrganizationalTopologyGraph {
  const nodes = [{ id: "project-core", type: "project", label: "Core Delivery", pressureScore: 66 }, { id: "pm-pool", type: "pm", label: "PM Pool", pressureScore: 72 }, { id: "governance-board", type: "governance", label: "Governance Board", pressureScore: 61 }, { id: "procurement-chain", type: "dependency", label: "Procurement", pressureScore: 70 }] as const;
  const edges: OrganizationalTopologyGraph["edges"] = [{ from: "procurement-chain", to: "project-core", relation: "blocks", weight: 0.82 }, { from: "project-core", to: "governance-board", relation: "escalates_to", weight: 0.58 }, { from: "pm-pool", to: "project-core", relation: "delivers_for", weight: 0.77 }];
  return { nodes: [...nodes], edges, bottlenecks: ["procurement-chain", "pm-pool"], pressureZones: ["delivery", "governance"], evidence: context.evidence, confidence: 0.76, uncertainty: ["topology inferred from bounded memory snapshots"], causalityRationale: ["blocked dependency chain increases pressure concentration"], survivabilityRationale: ["bottlenecks reduce milestone survivability"], governanceBoundaries: context.governanceBoundaries };
}

import { createAocRuntimeClient, RuntimeAuthorityAdapter } from "@/lib/aoc/runtime-client";
import { extractDomainFacts, type OperationalDomain } from "@/lib/operational-memory";

const runtime = createAocRuntimeClient(extractDomainFacts);
const authority = new RuntimeAuthorityAdapter(runtime);

export async function getRuntimeAuthorityView(input: { companyId: string; projectId: string | null; sourceRef: string; domain: OperationalDomain }) {
  const result = await authority.evaluateOperationalWrite(input);
  return {
    authorization: {
      allowed: result.allowed,
      evaluatedCapability: result.decision.evaluatedCapability,
      reason: result.decision.reason,
      source: result.decision.source,
    },
    explainability: result.trace,
    governanceContext: {
      namespace: result.namespace,
      actor: result.actor,
      machineAuthorityEnvelope: {
        actorType: result.actor.actorType,
        machineId: result.actor.machineId,
        constraints: result.trace.machineConstraints,
      },
    },
    observability: {
      authorityTrace: result.trace.trustLineage,
      obligationChain: result.trace.obligationTriggers,
      capabilityRouting: [result.decision.evaluatedCapability, input.domain],
      budgetConsumption: { tokens: null, unit: "runtime-managed" },
    },
  };
}

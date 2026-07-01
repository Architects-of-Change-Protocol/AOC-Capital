import { createDefaultAocProviders, type AocProviders } from "@/lib/aoc/providers";
import { buildWritePolicyDecision, requiredWriteCapability, resolveGovernanceActor } from "@/lib/aoc/providers/governance";
import type { CapabilityEvaluation, GovernanceActor, MemoryNamespace } from "@/lib/aoc/providers";
import type { OperationalDomain } from "@/lib/operational-memory";

export type RuntimeDecisionTrace = {
  evaluatedCapability: string;
  allowed: boolean;
  reason: string;
  source: string;
  obligationTriggers: string[];
  trustLineage: string[];
  consentLineage: string[];
  delegationAncestry: string[];
  machineConstraints: string[];
};

export class AocRuntimeClient {
  constructor(private readonly providers: AocProviders) {}

  resolveActor(actorRef: string): GovernanceActor {
    return resolveGovernanceActor(actorRef);
  }

  resolveNamespace(input: { companyId: string; projectId: string | null }): MemoryNamespace {
    return this.providers.vaultProvider.resolveMemoryNamespace(input);
  }

  async evaluateDomainWrite(input: { namespace: MemoryNamespace; actor: GovernanceActor; domain: OperationalDomain }): Promise<{ allowed: boolean; decision: CapabilityEvaluation; trace: RuntimeDecisionTrace }> {
    const capability = requiredWriteCapability(input.domain);
    const decision = await this.providers.capabilityProvider.evaluateCapability({ namespace: input.namespace, actor: input.actor, capability });
    const allowed = decision.allowed;
    const trace = this.toTrace(input, decision);
    return { allowed, decision, trace };
  }

  async saveOperationalMemory(input: { namespace: MemoryNamespace; domain: OperationalDomain; title: string; text: string; sourceRef: string }) {
    return this.providers.memoryProvider.saveOperationalMemory(input);
  }

  async listOperationalMemory(namespace: MemoryNamespace, domain?: OperationalDomain) {
    return this.providers.memoryProvider.listOperationalMemory(namespace, domain);
  }

  async recordAudit(input: { namespace: MemoryNamespace; eventType: string; actor: GovernanceActor; payload: Record<string, unknown> }) {
    await this.providers.auditProvider.recordEvent(input);
  }

  async exportPortableMemory(input: { scope: "organization" | "workspace" | "project"; companyId: string; sourceId?: string; exportedByActorRef: string }) {
    if (input.scope === "project" && input.sourceId) return this.providers.portableMemoryExportProvider.exportProjectMemory({ companyId: input.companyId, projectId: input.sourceId, exportedByActorRef: input.exportedByActorRef });
    if (input.scope === "workspace" && input.sourceId) return this.providers.portableMemoryExportProvider.exportWorkspaceMemory({ companyId: input.companyId, workspaceId: input.sourceId, exportedByActorRef: input.exportedByActorRef });
    return this.providers.portableMemoryExportProvider.exportOrganizationMemory({ companyId: input.companyId, exportedByActorRef: input.exportedByActorRef });
  }

  private toTrace(input: { namespace: MemoryNamespace; actor: GovernanceActor; domain: OperationalDomain }, decision: CapabilityEvaluation): RuntimeDecisionTrace {
    const policyDecision = buildWritePolicyDecision({ capabilityDecision: decision, domain: input.domain });
    return {
      evaluatedCapability: decision.evaluatedCapability,
      allowed: decision.allowed,
      reason: String(policyDecision.allowDenyReason ?? decision.reason),
      source: decision.source,
      obligationTriggers: ["runtime_policy_evaluation", input.domain],
      trustLineage: [`namespace:${input.namespace.namespaceKey}`, `actor:${input.actor.actorRef}`, `source:${decision.source}`],
      consentLineage: ["delegated_to_aoc_runtime", `scope:${input.namespace.governanceScope}`],
      delegationAncestry: ["pmfreak_ui", "runtime_execution_adapter", "aoc_runtime_authority"],
      machineConstraints: input.actor.actorType === "machine" ? ["machine_profile_capability_bounds", "runtime_scope_constraints"] : ["human_supervision_required_for_machine_execution"],
    };
  }
}

export class RuntimeAuthorityAdapter {
  constructor(private readonly runtime: AocRuntimeClient) {}

  async evaluateOperationalWrite(input: { companyId: string; projectId: string | null; sourceRef: string; domain: OperationalDomain }) {
    const namespace = this.runtime.resolveNamespace({ companyId: input.companyId, projectId: input.projectId });
    const actor = this.runtime.resolveActor(input.sourceRef);
    const result = await this.runtime.evaluateDomainWrite({ namespace, actor, domain: input.domain });
    return { namespace, actor, ...result };
  }
}

export class RuntimeExecutionAdapter {
  constructor(private readonly runtime: AocRuntimeClient, private readonly authority: RuntimeAuthorityAdapter) {}

  async saveOperationalMemory(input: { companyId: string; projectId: string | null; domain: OperationalDomain; title: string; text: string; sourceRef: string }) {
    const evalResult = await this.authority.evaluateOperationalWrite(input);
    if (!evalResult.allowed) {
      await this.runtime.recordAudit({
        namespace: evalResult.namespace,
        eventType: "runtime.operational_memory_write_denied",
        actor: evalResult.actor,
        payload: { domain: input.domain, title: input.title, runtimeTrace: evalResult.trace },
      });
      throw new Error("Unable to save operational memory: denied by AOC runtime authority.");
    }

    const record = await this.runtime.saveOperationalMemory({
      namespace: evalResult.namespace,
      domain: input.domain,
      title: input.title,
      text: input.text,
      sourceRef: input.sourceRef,
    });

    await this.runtime.recordAudit({
      namespace: evalResult.namespace,
      eventType: "runtime.operational_memory_saved",
      actor: evalResult.actor,
      payload: { id: record.id, domain: record.domain, title: record.title, runtimeTrace: evalResult.trace },
    });

    return { record, runtimeTrace: evalResult.trace };
  }
}

export const createAocRuntimeClient = (extractFacts: Parameters<typeof createDefaultAocProviders>[0]) => new AocRuntimeClient(createDefaultAocProviders(extractFacts));

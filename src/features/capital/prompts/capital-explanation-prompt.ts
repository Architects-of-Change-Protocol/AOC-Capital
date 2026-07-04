// AOC Capital Strategy Playbook — controlled LLM explanation prompt (v0.1).
//
// This is the only prompt allowed to ask an LLM to write about an AOC
// Capital strategy simulation. It hands the LLM a fixed set of facts (the
// constitution, the strategy definition, the stored simulation, and the
// suitability flags already computed by suitability-rules.ts) and forbids it
// from adding anything the domain layer didn't already decide — the LLM
// explains, it does not decide, invent, or recommend.

import type { InvestorConstitution } from "../domain/investor-constitution-schema";
import type { StrategyDefinition } from "../domain/strategy-registry";
import type { SimulationRecord } from "../domain/simulation-record-schema";
import type { SuitabilityFlag } from "../domain/suitability-rules";
import { REQUIRED_DISCLOSURE } from "../domain/llm-guardrails";

export type BuildCapitalExplanationPromptParams = {
  constitution: InvestorConstitution;
  strategy: StrategyDefinition;
  simulation: SimulationRecord;
  suitabilityFlags: SuitabilityFlag[];
};

const REQUIRED_OUTPUT_SECTIONS = [
  "Simulation Summary",
  "Why this strategy was considered",
  "Key risks observed",
  "Suitability consistency notes",
  "Scenario limitations",
  "What should be reviewed with a regulated advisor before any real-world decision",
];

function formatFlags(flags: SuitabilityFlag[]): string {
  if (flags.length === 0) return "(none)";
  return flags.map((flag) => `- [${flag.severity}] ${flag.code}: ${flag.message}`).join("\n");
}

function formatAllocation(simulation: SimulationRecord): string {
  if (simulation.allocation.length === 0) return "(none)";
  return simulation.allocation.map((a) => `- ${a.assetClass}: ${a.allocationPct}%`).join("\n");
}

function formatScenarioResults(simulation: SimulationRecord): string {
  if (simulation.scenarioResults.length === 0) return "(none)";
  return simulation.scenarioResults
    .map(
      (scenario) =>
        `- ${scenario.label}: simulated return ${scenario.simulatedReturnPct}%, simulated drawdown ${scenario.simulatedDrawdownPct}%. ${scenario.notes}`
    )
    .join("\n");
}

/**
 * Builds the full controlled prompt for explaining one stored SimulationRecord.
 * Everything the LLM is given here is already decided by the domain layer —
 * the constitution, the strategy, the simulation allocation/assumptions/
 * scenario results, and the suitability flags. The LLM's only job is to
 * narrate these facts inside the required section structure.
 */
export function buildCapitalExplanationPrompt(params: BuildCapitalExplanationPromptParams): string {
  const { constitution, strategy, simulation, suitabilityFlags } = params;

  return `You are explaining an AOC Capital paper-trading simulation. Read the rules below before writing anything.

RULES (do not violate any of these):
- You are not an investment adviser and must not act like one.
- You must not recommend buying or selling anything.
- You must not invent a strategy — only the strategy provided below exists.
- You must not invent an allocation — only the allocation provided below exists.
- You must not invent instruments or asset classes beyond what is listed below.
- You must not promise, guarantee, or imply any future return.
- You must not imply real execution, a real order, a broker, or an exchange in any way — this is a paper-trading simulation only.
- You may only explain the simulation data given below. Do not add facts that are not present in it.

SIMULATION DATA (ground truth — do not alter):

Strategy:
- ID: ${strategy.strategyId}
- Name: ${strategy.name}
- Version: ${strategy.version}
- Status: ${strategy.status}
- Objective: ${strategy.objective}
- Explanation template: ${strategy.explanationTemplate}

Investor Constitution:
- ID: ${constitution.constitutionId} (version ${constitution.version})
- Objective: ${constitution.investorObjective}
- Time horizon: ${constitution.timeHorizon}
- Risk tolerance: ${constitution.riskTolerance} / Risk capacity: ${constitution.riskCapacity}
- Financial knowledge: ${constitution.financialKnowledge}
- Complexity allowed: ${constitution.complexityAllowed}

Simulation Record:
- ID: ${simulation.simulationId}
- Mode: ${simulation.mode}
- Status: ${simulation.status}

Allocation:
${formatAllocation(simulation)}

Assumptions:
${simulation.assumptions.length > 0 ? simulation.assumptions.map((a) => `- ${a}`).join("\n") : "(none)"}

Scenario results:
${formatScenarioResults(simulation)}

Suitability consistency flags:
${formatFlags(suitabilityFlags)}

REQUIRED OUTPUT STRUCTURE — write exactly these sections, in this order:
${REQUIRED_OUTPUT_SECTIONS.map((section, i) => `${i + 1}. ${section}`).join("\n")}

After the last section, end your response with exactly this line, unchanged:
${REQUIRED_DISCLOSURE}`;
}

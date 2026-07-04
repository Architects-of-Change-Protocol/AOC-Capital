// AOC Capital Strategy Playbook — Simulation Record schema (v0.1).
//
// A SimulationRecord is the only artifact an LLM explanation is ever allowed
// to describe. It is a stored, paper-trading-only snapshot of one strategy
// evaluated against one investor constitution — never a live position, never
// a broker order. mode is a literal "paper_trading" (not a boolean or a wider
// enum) so there is no value this field could ever hold that implies real
// execution.

import type { AssetClass } from "./strategy-registry";
import type { SuitabilityFlag } from "./suitability-rules";

export type SimulationMode = "paper_trading";

export type SimulationStatus =
  | "draft"
  | "simulated"
  | "advisor_review_required"
  | "advisor_reviewed"
  | "approved_for_discussion"
  | "archived"
  | "superseded";

export type SimulationAllocation = {
  assetClass: AssetClass;
  allocationPct: number;
};

export type ScenarioResult = {
  scenarioId: string;
  label: string;
  simulatedReturnPct: number;
  simulatedDrawdownPct: number;
  notes: string;
};

export const CURRENT_DISCLAIMER_VERSION = "capital-disclaimer-v1";

export interface SimulationRecord {
  simulationId: string;
  createdAt: string;
  createdBy: string;

  /** Always "paper_trading" — there is no other mode this domain layer supports. */
  mode: SimulationMode;

  investorProfileId: string;
  investorConstitutionId: string;
  investorConstitutionVersion: number;

  strategyId: string;
  strategyVersion: number;

  allocation: SimulationAllocation[];
  assumptions: string[];
  riskFlags: SuitabilityFlag[];
  scenarioResults: ScenarioResult[];

  llmExplanation: string | null;
  disclaimerVersion: string;
  advisorNotes: string | null;

  status: SimulationStatus;

  /** Optional integrity hash over the record's immutable fields, once computed. */
  auditHash?: string;
}

export type CreateDraftSimulationRecordInput = {
  simulationId: string;
  createdBy: string;
  investorProfileId: string;
  investorConstitutionId: string;
  investorConstitutionVersion: number;
  strategyId: string;
  strategyVersion: number;
  allocation: SimulationAllocation[];
  assumptions: string[];
  riskFlags: SuitabilityFlag[];
  createdAt?: string;
};

/**
 * Builds a new SimulationRecord in "draft" status. No scenario results, LLM
 * explanation, or advisor notes exist yet — those are attached by later,
 * separate steps in the (not-yet-implemented) simulation pipeline.
 */
export function createDraftSimulationRecord(input: CreateDraftSimulationRecordInput): SimulationRecord {
  return {
    simulationId: input.simulationId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    createdBy: input.createdBy,
    mode: "paper_trading",
    investorProfileId: input.investorProfileId,
    investorConstitutionId: input.investorConstitutionId,
    investorConstitutionVersion: input.investorConstitutionVersion,
    strategyId: input.strategyId,
    strategyVersion: input.strategyVersion,
    allocation: input.allocation,
    assumptions: input.assumptions,
    riskFlags: input.riskFlags,
    scenarioResults: [],
    llmExplanation: null,
    disclaimerVersion: CURRENT_DISCLAIMER_VERSION,
    advisorNotes: null,
    status: "draft",
  };
}

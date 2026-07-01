export type TrialScenarioCategory =
  | "dependency_blockage"
  | "stakeholder_alignment"
  | "financial_constraint"
  | "vendor_delay"
  | "scope_ambiguity"
  | "escalation_pressure"
  | "governance_friction"
  | "execution_recovery";

export type TrialSource = "manual" | "live-project" | "historical";

export type TrialScenario = {
  id: string;
  title: string;
  category: TrialScenarioCategory;
  source: TrialSource;
  projectContext?: string;
  language: "en" | "es";
  prompt: string;
  expectedHumanReasoning?: string;
  createdAt: number;
};

export type TrialOutcome = "pmfreak-superior" | "pm-superior" | "equivalent" | "inconclusive";

export type TrialEvaluation = {
  scenarioId: string;
  pmResponse: string;
  pmfreakResponse: string;
  usefulnessScore: 1 | 2 | 3 | 4 | 5;
  prioritizationScore: 1 | 2 | 3 | 4 | 5;
  escalationJudgmentScore: 1 | 2 | 3 | 4 | 5;
  framingScore: 1 | 2 | 3 | 4 | 5;
  trustScore: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  outcome?: TrialOutcome;
};

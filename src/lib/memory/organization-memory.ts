import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MemoryProjectState = {
  objective: string | null;
  currentPhase: string | null;
  milestones: string[];
  blockers: string[];
  risks: string[];
  commitments: string[];
  dependencies: string[];
  unresolvedIssues: string[];
};

export type StakeholderMemory = {
  name: string;
  role: string | null;
  influence: "low" | "medium" | "high";
  ownership: string[];
  sentimentSignals: string[];
  pressurePatterns: string[];
  politicalRelevance: "low" | "medium" | "high";
  decisionAuthority: "advisor" | "approver" | "driver" | "blocker";
};

export type DecisionMemory = {
  summary: string;
  owner: string | null;
  decidedAt: string;
  impactedSystems: string[];
  unresolvedConsequences: string[];
};

export type ProjectMemorySnapshot = {
  projectId: string;
  projectName: string;
  project: MemoryProjectState;
  stakeholders: StakeholderMemory[];
  decisions: DecisionMemory[];
  detectedConcerns: string[];
  lastUpdatedAt: string;
};

export const EMPTY_PROJECT_MEMORY: MemoryProjectState = {
  objective: null,
  currentPhase: null,
  milestones: [],
  blockers: [],
  risks: [],
  commitments: [],
  dependencies: [],
  unresolvedIssues: [],
};

export async function readProjectMemorySnapshot(projectId: string): Promise<ProjectMemorySnapshot | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_memory_snapshots")
    .select("project_id, project_name, project_state, stakeholders, decisions, detected_concerns, updated_at")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw new Error(`Unable to read memory snapshot: ${error.message}`);
  if (!data) return null;

  return {
    projectId: data.project_id,
    projectName: data.project_name,
    project: (data.project_state as MemoryProjectState) ?? EMPTY_PROJECT_MEMORY,
    stakeholders: (data.stakeholders as StakeholderMemory[]) ?? [],
    decisions: (data.decisions as DecisionMemory[]) ?? [],
    detectedConcerns: (data.detected_concerns as string[]) ?? [],
    lastUpdatedAt: data.updated_at,
  };
}

export const buildAmbientContextSummary = (snapshot: ProjectMemorySnapshot | null) => {
  if (!snapshot) {
    return {
      blockers: ["No blockers extracted yet."],
      recentDecisions: ["No material decisions captured yet."],
      stakeholderPressure: ["No stakeholder pressure patterns detected yet."],
      criticalRisks: ["No critical risks detected yet."],
      concerns: ["Continue chatting or uploading files to build memory context."],
    };
  }

  return {
    blockers: snapshot.project.blockers.slice(0, 4),
    recentDecisions: snapshot.decisions.slice(0, 4).map((item) => item.summary),
    stakeholderPressure: snapshot.stakeholders.flatMap((item) => item.pressurePatterns).slice(0, 4),
    criticalRisks: snapshot.project.risks.slice(0, 4),
    concerns: snapshot.detectedConcerns.slice(0, 4),
  };
};

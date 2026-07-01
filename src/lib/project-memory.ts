import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StoredProjectAnalysisContract } from "@/lib/contracts";

export type ComplexityLevel = "Low" | "Medium" | "High";

export type StoredProjectAnalysis = {
  id: string;
  projectName: string;
  uploadDate: string;
  executiveSummary: string;
  requirements: string[];
  risks: string[];
  dependencies: string[];
  ambiguities: string[];
  complexity: ComplexityLevel;
  sourceFileNames: string[];
  similarProjects: string[];
  historicalRisks: string[];
  estimatedRelativeComplexity: string;
};

const complexityScore: Record<ComplexityLevel, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

const dedupe = (items: string[]) => {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const item of items) {
    const cleaned = item.trim();
    const key = normalize(cleaned);
    if (!cleaned || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(cleaned);
  }

  return output;
};

const mapRowToStoredProject = (row: {
  project_id: string;
  project_name: string;
  upload_date: string;
  executive_summary: string;
  requirements: string[] | null;
  risks: string[] | null;
  dependencies: string[] | null;
  ambiguities: string[] | null;
  complexity: ComplexityLevel;
  source_file_names: string[] | null;
  similar_projects: string[] | null;
  historical_risks: string[] | null;
  estimated_relative_complexity: string;
}): StoredProjectAnalysis => ({
  id: row.project_id,
  projectName: row.project_name,
  uploadDate: row.upload_date,
  executiveSummary: row.executive_summary,
  requirements: row.requirements ?? [],
  risks: row.risks ?? [],
  dependencies: row.dependencies ?? [],
  ambiguities: row.ambiguities ?? [],
  complexity: row.complexity,
  sourceFileNames: row.source_file_names ?? [],
  similarProjects: row.similar_projects ?? [],
  historicalRisks: row.historical_risks ?? [],
  estimatedRelativeComplexity: row.estimated_relative_complexity,
});

export const readProjectMemory = async (companyId: string): Promise<StoredProjectAnalysis[]> => {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("project_memories")
    .select(
      "project_id, project_name, upload_date, executive_summary, requirements, risks, dependencies, ambiguities, complexity, source_file_names, similar_projects, historical_risks, estimated_relative_complexity",
    )
    .eq("company_id", companyId)
    .order("upload_date", { ascending: false });

  if (error) {
    throw new Error(`Unable to read project memory: ${error.message}`);
  }

  return (data ?? [])
    .map(mapRowToStoredProject)
    .filter((project) => {
      const result = StoredProjectAnalysisContract(project);
      if (!result.ok) {
        console.warn("[contracts] stored_project_analysis_invalid", {
          errors: result.errors,
          projectId: project.id ?? "unknown",
        });
        return false;
      }
      return true;
    });
};

export const writeProjectMemory = async (companyId: string, projects: StoredProjectAnalysis[]) => {
  const supabase = await createSupabaseServerClient();

  const { error: deleteError } = await supabase.from("project_memories").delete().eq("company_id", companyId);

  if (deleteError) {
    throw new Error(`Unable to clear project memory: ${deleteError.message}`);
  }

  if (projects.length === 0) {
    return;
  }

  const rows = projects.map((project) => ({
    company_id: companyId,
    project_id: project.id,
    project_name: project.projectName,
    upload_date: project.uploadDate,
    executive_summary: project.executiveSummary,
    requirements: project.requirements,
    risks: project.risks,
    dependencies: project.dependencies,
    ambiguities: project.ambiguities,
    complexity: project.complexity,
    source_file_names: project.sourceFileNames,
    similar_projects: project.similarProjects,
    historical_risks: project.historicalRisks,
    estimated_relative_complexity: project.estimatedRelativeComplexity,
    updated_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase.from("project_memories").insert(rows);

  if (insertError) {
    throw new Error(`Unable to persist project memory: ${insertError.message}`);
  }
};

const computeSimilarityScore = (current: StoredProjectAnalysis, candidate: StoredProjectAnalysis) => {
  const currentRequirements = new Set(current.requirements.map(normalize));
  const candidateRequirements = new Set(candidate.requirements.map(normalize));
  const currentDependencies = new Set(current.dependencies.map(normalize));
  const candidateDependencies = new Set(candidate.dependencies.map(normalize));

  const sharedRequirements = Array.from(currentRequirements).filter((item) => candidateRequirements.has(item)).length;
  const sharedDependencies = Array.from(currentDependencies).filter((item) => candidateDependencies.has(item)).length;
  const complexityDistance = Math.abs(complexityScore[current.complexity] - complexityScore[candidate.complexity]);

  return sharedRequirements * 2 + sharedDependencies * 3 - complexityDistance;
};

const estimateRelativeComplexity = (current: ComplexityLevel, historical: ComplexityLevel[]) => {
  if (historical.length === 0) {
    return "Baseline not available yet (first project in memory).";
  }

  const average = historical.reduce((sum, level) => sum + complexityScore[level], 0) / historical.length;
  const delta = complexityScore[current] - average;

  if (delta >= 0.75) {
    return "Above historical average complexity.";
  }

  if (delta <= -0.75) {
    return "Below historical average complexity.";
  }

  return "In line with historical average complexity.";
};

export const enrichWithPortfolioIntelligence = (
  current: Omit<StoredProjectAnalysis, "similarProjects" | "historicalRisks" | "estimatedRelativeComplexity">,
  previousProjects: StoredProjectAnalysis[],
): Pick<StoredProjectAnalysis, "similarProjects" | "historicalRisks" | "estimatedRelativeComplexity"> => {
  const scored = previousProjects
    .map((project) => ({
      project,
      score: computeSimilarityScore(
        { ...current, similarProjects: [], historicalRisks: [], estimatedRelativeComplexity: "" },
        project,
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const similarProjects = scored.map((item) => item.project.projectName);
  const historicalRisks = dedupe(previousProjects.flatMap((project) => project.risks)).slice(0, 10);
  const estimatedRelativeComplexity = estimateRelativeComplexity(
    current.complexity,
    previousProjects.map((project) => project.complexity),
  );

  return {
    similarProjects,
    historicalRisks,
    estimatedRelativeComplexity,
  };
};

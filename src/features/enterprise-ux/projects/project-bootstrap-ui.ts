import type { ProjectBootstrapInput } from "../types/enterprise-ux-types";

export interface ProjectBootstrapStep {
  id: string;
  order: number;
  prompt: string;
  hint: string;
  valueExplanation: string;
  isRequired: boolean;
}

export function buildProjectBootstrapSteps(): ProjectBootstrapStep[] {
  return [
    {
      id: "project-name",
      order: 1,
      prompt: "What is this project called?",
      hint: "Use the name your team recognizes. This becomes the coordination boundary for operational signals.",
      valueExplanation:
        "PMFreak builds survivability models, escalation paths, and coordination memory around project boundaries.",
      isRequired: true,
    },
    {
      id: "operational-context",
      order: 2,
      prompt: "What is this project trying to accomplish?",
      hint: "A brief description of the delivery goal, timeline pressure, or stakeholder expectations.",
      valueExplanation:
        "Operational context helps PMFreak calibrate survivability thresholds and escalation sensitivity for this project.",
      isRequired: false,
    },
    {
      id: "coordination-concerns",
      order: 3,
      prompt: "What coordination challenges are you anticipating?",
      hint: "Examples: cross-team dependencies, executive escalation risk, PM bandwidth constraints.",
      valueExplanation:
        "Declared coordination concerns seed the initial operational topology for this project.",
      isRequired: false,
    },
    {
      id: "risk-awareness",
      order: 4,
      prompt: "What risks are you already aware of?",
      hint: "Examples: known blockers, timeline pressure, stakeholder misalignment.",
      valueExplanation:
        "Risk declarations seed the survivability model and help PMFreak surface early intervention signals.",
      isRequired: false,
    },
  ];
}

export function buildProjectFirstValueNarrative(
  input: ProjectBootstrapInput
): string {
  const parts = [
    `Project "${input.projectName}" has been created.`,
    "PMFreak will begin building survivability models as operational signals are ingested.",
  ];

  if (input.coordinationConcerns.length > 0) {
    parts.push(
      `Coordination concerns declared: ${input.coordinationConcerns.slice(0, 2).join("; ")}. These will inform initial escalation sensitivity.`
    );
  }

  if (input.riskAwareness.length > 0) {
    parts.push(
      `Known risks noted: ${input.riskAwareness.slice(0, 2).join("; ")}. These seed the initial survivability baseline.`
    );
  }

  parts.push(
    "To unlock the war-room and first operational insights, ingest your first coordination signal via the Input Hub."
  );

  return parts.join(" ");
}

export function validateProjectBootstrapInput(
  input: Partial<ProjectBootstrapInput>
): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  if (!input.projectName || input.projectName.trim().length < 2) {
    missingFields.push("projectName");
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

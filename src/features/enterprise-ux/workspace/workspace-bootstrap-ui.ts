import type {
  ConnectorId,
  WorkspaceBootstrapInput,
} from "../types/enterprise-ux-types";

export interface WorkspaceBootstrapStep {
  id: string;
  order: number;
  prompt: string;
  hint: string;
  governanceNote: string | null;
  isRequired: boolean;
}

export function buildWorkspaceBootstrapSteps(): WorkspaceBootstrapStep[] {
  return [
    {
      id: "workspace-name",
      order: 1,
      prompt: "What should we call your workspace?",
      hint: "Use a name that reflects your team, program, or organization. This becomes the governance anchor for all operational signals.",
      governanceNote:
        "The workspace name is used for source lineage attribution. It appears on all insights generated within this workspace.",
      isRequired: true,
    },
    {
      id: "operational-goals",
      order: 2,
      prompt: "What operational challenges are you trying to address?",
      hint: "Examples: reducing escalation response time, improving project survivability visibility, coordinating across distributed PMs.",
      governanceNote: null,
      isRequired: false,
    },
    {
      id: "governance-expectations",
      order: 3,
      prompt: "What are your approval and oversight expectations?",
      hint: "Examples: all interventions require PM sign-off, executive summaries need VP review, escalations auto-notify team lead.",
      governanceNote:
        "Governance expectations are applied to the intervention runtime. They can be adjusted later but retroactive application to ingested data may require re-processing.",
      isRequired: false,
    },
    {
      id: "connector-intentions",
      order: 4,
      prompt: "Which systems do you intend to connect to PMFreak?",
      hint: "You do not need to configure OAuth now. Declaring intentions unlocks connector-specific guidance and federation explanations.",
      governanceNote:
        "No live data is ingested until OAuth is explicitly configured and authorized.",
      isRequired: false,
    },
    {
      id: "first-use-case",
      order: 5,
      prompt: "What is your primary operational use case for this workspace?",
      hint: "Examples: delivery pressure monitoring for a specific program, escalation coordination for a PMO, stakeholder relationship tracking.",
      governanceNote: null,
      isRequired: false,
    },
  ];
}

export function validateWorkspaceBootstrapInput(
  input: Partial<WorkspaceBootstrapInput>
): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  if (!input.workspaceName || input.workspaceName.trim().length < 2) {
    missingFields.push("workspaceName");
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

export function buildWorkspaceBootstrapSummary(
  input: WorkspaceBootstrapInput
): string {
  const connectorNames = input.connectorIntentions
    .map((c) => connectorDisplayName(c))
    .join(", ");

  const parts = [
    `Workspace "${input.workspaceName}" is being initialized.`,
  ];

  if (input.operationalGoals.length > 0) {
    parts.push(
      `Operational focus: ${input.operationalGoals.slice(0, 2).join("; ")}.`
    );
  }

  if (connectorNames) {
    parts.push(
      `Connector intentions declared: ${connectorNames}. No data will be ingested until OAuth is configured.`
    );
  }

  if (input.firstOperationalUseCase) {
    parts.push(`Primary use case: ${input.firstOperationalUseCase}.`);
  }

  parts.push(
    "Governance boundaries and tenant isolation are active from workspace creation."
  );

  return parts.join(" ");
}

function connectorDisplayName(id: ConnectorId): string {
  const names: Record<ConnectorId, string> = {
    jira: "Jira",
    slack: "Slack",
    github: "GitHub",
    calendar: "Calendar",
  };
  return names[id] ?? id;
}

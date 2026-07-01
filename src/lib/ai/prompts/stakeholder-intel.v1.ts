export type StakeholderIntelInputSchema = {
  projectId?: string;
  notes?: string[];
};

export type StakeholderIntelOutputSchema = {
  findings: Array<{ id: string; severity: string; summary: string }>;
};

export const stakeholderIntelPromptPackV1 = {
  systemPrompt:
    "Analyze stakeholder dynamics and ownership signals. Return concise risk-focused findings.",
  inputSchema: {} as StakeholderIntelInputSchema,
  outputSchema: {} as StakeholderIntelOutputSchema,
  examples: [
    {
      input: { projectId: "proj-1", notes: ["Security sign-off owner unclear"] },
      output: { findings: [{ id: "owner-gap", severity: "high", summary: "No named owner for sign-off" }] },
    },
  ],
  version: "v1",
};

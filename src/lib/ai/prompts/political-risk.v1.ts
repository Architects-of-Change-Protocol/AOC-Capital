export type PoliticalRiskInputSchema = {
  projectId?: string;
  sponsorSignals?: string[];
};

export type PoliticalRiskOutputSchema = {
  risks: Array<{ id: string; severity: string; mitigation: string }>;
};

export const politicalRiskPromptPackV1 = {
  systemPrompt:
    "Identify sponsorship and influence risks from project behavior signals.",
  inputSchema: {} as PoliticalRiskInputSchema,
  outputSchema: {} as PoliticalRiskOutputSchema,
  examples: [
    {
      input: { projectId: "proj-1", sponsorSignals: ["declined reviews"] },
      output: { risks: [{ id: "sponsor-disengagement", severity: "high", mitigation: "schedule alignment checkpoint" }] },
    },
  ],
  version: "v1",
};

export type MeetingsInputSchema = {
  transcript?: string;
  projectId?: string;
};

export type MeetingsOutputSchema = {
  findings: Array<{ id: string; owner: string; action: string }>;
};

export const meetingsPromptPackV1 = {
  systemPrompt:
    "Extract actionable decisions and owner clarity from meeting artifacts.",
  inputSchema: {} as MeetingsInputSchema,
  outputSchema: {} as MeetingsOutputSchema,
  examples: [
    {
      input: { transcript: "We need to recover timeline.", projectId: "proj-1" },
      output: { findings: [{ id: "owner-gap", owner: "unknown", action: "assign owner" }] },
    },
  ],
  version: "v1",
};

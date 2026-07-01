export type EscalationGuideInputSchema = {
  issue?: string;
  impact?: string;
};

export type EscalationGuideOutputSchema = {
  recommendations: Array<{ id: string; ask: string; owner: string }>;
};

export const escalationGuidePromptPackV1 = {
  systemPrompt:
    "Assess escalation readiness and produce clear asks, options, and accountability guidance.",
  inputSchema: {} as EscalationGuideInputSchema,
  outputSchema: {} as EscalationGuideOutputSchema,
  examples: [
    {
      input: { issue: "Dependency delay", impact: "UAT slip" },
      output: { recommendations: [{ id: "memo", ask: "Decision on scope", owner: "Delivery Director" }] },
    },
  ],
  version: "v1",
};

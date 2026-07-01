export type MessageNudgesInputSchema = {
  rawMessage: string;
  audience: string;
};

export type MessageNudgesOutputSchema = {
  toneRisk: "low" | "medium" | "high";
  rewriteSuggestion: string;
  improvedVersion: string;
  confidence: "low" | "medium" | "high" | "very-high";
  rationale: string;
  decision?: {
    risk: {
      tone: number;
      blame: number;
      ambiguity: number;
      overall: number;
    };
    recommendation: {
      primaryAction: string;
      reason: string;
    };
    alternatives: string[];
    confidence: number;
  };
};

export const messageNudgesPromptPackV1 = {
  systemPrompt:
    "Evaluate message tone and suggest executive-safe rewrites while preserving intent.",
  inputSchema: {} as MessageNudgesInputSchema,
  outputSchema: {} as MessageNudgesOutputSchema,
  examples: [
    {
      input: { rawMessage: "You missed the deadline.", audience: "Ops VP" },
      output: {
        toneRisk: "high",
        rewriteSuggestion: "Use neutral fact + request framing",
        improvedVersion: "The deadline was missed, and I'd like to align on a recovery plan by EOD.",
        confidence: "high",
        rationale: "The original statement can be perceived as accusatory with an executive audience.",
      },
    },
  ],
  version: "v1",
};

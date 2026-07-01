export type ConfidenceLevel = "low" | "medium" | "high" | "very-high";

export type SeverityLevel = "low" | "moderate" | "high" | "critical";

export type SourceTag = {
  label: string;
  context: string;
};

export type Recommendation = {
  title: string;
  owner: string;
  dueBy: string;
  actionLabel?: string;
};

export type AIResponseCard = {
  id: string;
  headline: string;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  severity: SeverityLevel;
  rationale: string;
  recommendedNextAction: Recommendation;
  sourceTags: SourceTag[];
};

export type MemoryEvent = {
  id: string;
  timestamp: string;
  type: "decision" | "risk" | "escalation" | "owner-gap" | "comms";
  summary: string;
  module: "stakeholder-intel" | "meetings" | "political-risk" | "escalation-guide" | "message-nudges" | "project-memory";
};

export type InferenceMode = "live" | "mock" | "fallback";

export type AIResponseEnvelope<T> = {
  module: string;
  generatedAt: string;
  confidence: ConfidenceLevel;
  summary: string;
  data: T;
  // Inference transparency: callers can distinguish real model output from
  // simulated data. "live" = real model call succeeded. "mock" = module is
  // pre-production and returns static fixture data. "fallback" = real model
  // path failed or is unimplemented; static data was substituted.
  inferenceMode?: InferenceMode;
  isSimulated?: boolean;
  productionReady?: boolean;
};

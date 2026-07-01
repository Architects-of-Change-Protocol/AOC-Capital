import type { AIResponseEnvelope } from "@/lib/ai/types";

export type AIModuleId =
  | "stakeholder-intel"
  | "meetings"
  | "political-risk"
  | "escalation-guide"
  | "message-nudges"
  | "project-memory";

// "mock"   — returns pre-built mock envelope; always available
// "openai" — calls OpenAI API; currently only message-nudges is implemented
// "hybrid" — planned: OpenAI + memory integration; falls back to mock until implemented
export type AIModuleMode = "mock" | "openai" | "hybrid";

export type MemoryContext = {
  projectMemory: unknown[];
  recentEvents: unknown[];
  stakeholderSignals: unknown[];
  derivedSignals?: {
    toneTrend: "improving" | "worsening" | "stable" | "unknown";
    blamePattern: "increasing" | "decreasing" | "stable" | "spiky" | "unknown";
    riskTrend: "improving" | "worsening" | "stable" | "unknown";
    escalationSignal: "ready" | "watch" | "not-ready" | "unknown";
  };
};

export type RunAIModuleInput = {
  moduleId: AIModuleId;
  input: unknown;
  context?: {
    projectId?: string;
    workspaceId?: string;
    actor?: {
      actorType?: string;
      actorUserId?: string | null;
      actorAgentId?: string | null;
    };
    [key: string]: unknown;
  };
  traceId?: string;
};

export type AIModuleHandler = (args: {
  input: unknown;
  context: RunAIModuleInput["context"];
  memory: MemoryContext;
}) => Promise<AIResponseEnvelope<unknown>>;

export type AIModuleConfig = {
  id: AIModuleId;
  route: string;
  promptVersion: string;
  mode: AIModuleMode;
  handler: AIModuleHandler;
  // false = module returns static fixture data; callers receive inferenceMode: "mock".
  // Omitted or true = module is production-ready and performs real inference.
  productionReady?: boolean;
};

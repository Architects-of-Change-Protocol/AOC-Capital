import {
  escalationGuideEnvelope,
  meetingsEnvelope,
  messageNudgesEnvelope,
  politicalRiskEnvelope,
  projectMemoryEnvelope,
  stakeholderIntelEnvelope,
} from "@/lib/ai/mock-data";
import type { AIModuleConfig, AIModuleId } from "@/lib/ai/gateway/types";

const createMockHandler = (moduleId: AIModuleId): AIModuleConfig["handler"] => async () => {
  switch (moduleId) {
    case "stakeholder-intel":
      return stakeholderIntelEnvelope;
    case "meetings":
      return meetingsEnvelope;
    case "political-risk":
      return politicalRiskEnvelope;
    case "escalation-guide":
      return escalationGuideEnvelope;
    case "message-nudges":
      return messageNudgesEnvelope;
    case "project-memory":
      return projectMemoryEnvelope;
  }
};

const moduleConfigs: AIModuleConfig[] = [
  { id: "stakeholder-intel", route: "/api/ai/stakeholder-intel", promptVersion: "v1", mode: "mock", productionReady: false, handler: createMockHandler("stakeholder-intel") },
  { id: "meetings", route: "/api/ai/meetings", promptVersion: "v1", mode: "mock", productionReady: false, handler: createMockHandler("meetings") },
  { id: "political-risk", route: "/api/ai/political-risk", promptVersion: "v1", mode: "mock", productionReady: false, handler: createMockHandler("political-risk") },
  { id: "escalation-guide", route: "/api/ai/escalation-guide", promptVersion: "v1", mode: "mock", productionReady: false, handler: createMockHandler("escalation-guide") },
  { id: "message-nudges", route: "/api/ai/message-nudges", promptVersion: "v1", mode: "openai", productionReady: true, handler: createMockHandler("message-nudges") },
  { id: "project-memory", route: "/api/ai/project-memory", promptVersion: "v1", mode: "mock", productionReady: false, handler: createMockHandler("project-memory") },
];

export const aiModuleRegistry = new Map<AIModuleId, AIModuleConfig>(
  moduleConfigs.map((config) => [config.id, config]),
);

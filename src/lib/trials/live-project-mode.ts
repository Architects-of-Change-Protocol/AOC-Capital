import type { TrialScenario, TrialScenarioCategory } from "@/lib/trials/trial-model";

export type LiveProjectInput = {
  projectContext: string;
  uploadedDocs?: string[];
  operationalMemory?: string[];
  language?: "en" | "es";
};

const CATEGORY_RULES: Array<{ category: TrialScenarioCategory; markers: string[] }> = [
  { category: "vendor_delay", markers: ["vendor", "supplier", "shipment", "proveedor"] },
  { category: "financial_constraint", markers: ["budget", "cost", "approval", "financiera"] },
  { category: "dependency_blockage", markers: ["dependency", "blocked", "access", "dependencia"] },
  { category: "governance_friction", markers: ["governance", "committee", "comité", "traceability"] },
];

export function generateLiveProjectScenario(input: LiveProjectInput): TrialScenario {
  const text = `${input.projectContext} ${(input.uploadedDocs ?? []).join(" ")} ${(input.operationalMemory ?? []).join(" ")}`.toLowerCase();
  const matched = CATEGORY_RULES.find((rule) => rule.markers.some((marker) => text.includes(marker)));
  const category = matched?.category ?? "execution_recovery";
  return { id: `live-${Date.now()}`, title: "Live Project Pressure Trial", category, source: "live-project", projectContext: input.projectContext, language: input.language ?? "en", prompt: input.projectContext, createdAt: Date.now() };
}

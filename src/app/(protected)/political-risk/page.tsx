import { ModuleShell } from "@/components/pmfreak/module-shell";
import { ModuleIntelligenceClient } from "@/components/pmfreak/intelligence/module-intelligence-client";

export default function PoliticalRiskPage() {
  return <ModuleShell title="Political Risk Alerts" subtitle="Detect organizational friction patterns that may derail execution and sponsorship." metrics={[{ label: "Open risk alerts", value: "5" }, { label: "Critical", value: "1", delta: "Sponsor disengagement risk" }, { label: "Escalation likelihood", value: "68%" }, { label: "Alert confidence", value: "0.84" }]}><ModuleIntelligenceClient endpoint="/api/ai/political-risk" /></ModuleShell>;
}

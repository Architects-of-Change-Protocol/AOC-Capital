import { ModuleShell } from "@/components/pmfreak/module-shell";
import { ModuleIntelligenceClient } from "@/components/pmfreak/intelligence/module-intelligence-client";

export default function StakeholderIntelPage() {
  return <ModuleShell title="Stakeholder Intelligence" subtitle="Relationship heatmap for key project actors with influence and volatility indicators." metrics={[{ label: "At-risk stakeholders", value: "2", delta: "Hidden owner impacting Security lane" }, { label: "Alignment score", value: "74%", delta: "Sponsor engagement trending down" }, { label: "Touchpoints overdue", value: "3", delta: "Ops + Security follow-up required" }, { label: "Confidence", value: "0.90", delta: "Model confidence very high" }]}><ModuleIntelligenceClient endpoint="/api/ai/stakeholder-intel" /></ModuleShell>;
}

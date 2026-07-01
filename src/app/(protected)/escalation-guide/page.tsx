import { ModuleShell } from "@/components/pmfreak/module-shell";
import { ModuleIntelligenceClient } from "@/components/pmfreak/intelligence/module-intelligence-client";

export default function EscalationGuidePage() {
  return <ModuleShell title="Escalation Guidance Engine" subtitle="Recommend escalation targets, timing, and communication scripts by risk profile." metrics={[{ label: "Readiness score", value: "79/100" }, { label: "Pending escalations", value: "2" }, { label: "Recommended window", value: "Next 24h" }, { label: "Script confidence", value: "0.82", delta: "Escalation not ready" }]}><ModuleIntelligenceClient endpoint="/api/ai/escalation-guide" /></ModuleShell>;
}

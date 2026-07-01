import { ModuleShell } from "@/components/pmfreak/module-shell";
import { ModuleIntelligenceClient } from "@/components/pmfreak/intelligence/module-intelligence-client";

export default function MessageNudgesPage() {
  return <ModuleShell title="Smart Message Nudges" subtitle="Generate persona-aware communication options for executives, clients, and delivery teams." metrics={[{ label: "Drafts generated", value: "34" }, { label: "Exec-ready", value: "9" }, { label: "Client-safe tone", value: "92%" }, { label: "Nudge confidence", value: "0.91", delta: "Accusatory phrasing detected" }]}><ModuleIntelligenceClient endpoint="/api/ai/message-nudges" /></ModuleShell>;
}

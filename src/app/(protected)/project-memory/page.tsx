import { ModuleShell } from "@/components/pmfreak/module-shell";
import { ProjectMemoryClient } from "@/components/pmfreak/intelligence/project-memory-client";

export default function ProjectMemoryPage() {
  return <ModuleShell title="Project Memory" subtitle="Persistent timeline of decisions, risks, escalations, and commitments for rapid context recall." metrics={[{ label: "Events indexed", value: "148" }, { label: "Decisions", value: "44" }, { label: "Escalations", value: "11" }, { label: "Recall confidence", value: "0.93" }]}><ProjectMemoryClient endpoint="/api/ai/project-memory" /></ModuleShell>;
}

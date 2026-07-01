import { ModuleShell } from "@/components/pmfreak/module-shell";
import { OperationalMemoryWorkspace } from "@/components/pmfreak/operational-memory/workspace";

export default function OperationalMemoryPage() {
  return (
    <ModuleShell
      title="Structured Operational Memory"
      subtitle="Domain-specific operational chats with deterministic extraction, completion scoring, and source-traceable records."
      metrics={[
        { label: "Domains", value: "7" },
        { label: "Extraction", value: "Deterministic" },
        { label: "Traceability", value: "Enabled" },
        { label: "Persistence", value: "Supabase" },
      ]}
    >
      <OperationalMemoryWorkspace />
    </ModuleShell>
  );
}

import type { ExecutiveSynthesisSnapshot } from "@/lib/executive-synthesis";
import { ExecutiveAlerts } from "@/components/pmfreak/executive/executive-alerts";
import { ExecutiveHealthCard } from "@/components/pmfreak/executive/executive-health-card";
import { ExecutiveTimeline } from "@/components/pmfreak/executive/executive-timeline";
import { InterventionPanel } from "@/components/pmfreak/executive/intervention-panel";

export function ExecutiveDashboard({ snapshot }: { snapshot: ExecutiveSynthesisSnapshot }) {
  return (
    <div className="space-y-4">
      <ExecutiveHealthCard health={snapshot.health} coherence={snapshot.coherence.overall} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ExecutiveAlerts insights={snapshot.insights} />
        <InterventionPanel interventions={snapshot.interventions} />
      </div>
      <ExecutiveTimeline events={snapshot.timeline} />
    </div>
  );
}

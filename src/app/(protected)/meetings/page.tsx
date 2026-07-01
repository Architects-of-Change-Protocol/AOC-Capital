import { ModuleShell } from "@/components/pmfreak/module-shell";
import { ModuleIntelligenceClient } from "@/components/pmfreak/intelligence/module-intelligence-client";

export default function MeetingsPage() {
  return <ModuleShell title="Meeting Transcript Analyzer" subtitle="Extract decisions, owners, blockers, and follow-ups from leadership and delivery syncs." metrics={[{ label: "Transcripts processed", value: "12" }, { label: "Decisions extracted", value: "28" }, { label: "Action items", value: "17", delta: "Meeting ended without clear owner" }, { label: "Sentiment drift", value: "-0.12", delta: "Escalation tone increasing" }]}><ModuleIntelligenceClient endpoint="/api/ai/meetings" /></ModuleShell>;
}

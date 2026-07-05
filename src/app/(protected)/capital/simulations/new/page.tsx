import { requireAuthUser } from "@/lib/auth";
import { PortfolioSimulationBuilderContent } from "./portfolio-simulation-builder-content";

// Intentionally does not create a simulation record, trade intent, or paper
// position, does not connect to any real-execution venue, does not fetch
// live pricing, and never calls an LLM. This route only reads the
// already-generated Investor Constitution (handed off from
// /capital/constitution/new via sessionStorage, same mechanism as
// /capital/constitution/result) and builds a local, in-memory paper
// simulation draft from the existing Strategy Registry and Suitability
// Consistency Engine. Persisting the draft as a stored Simulation Record is a
// later PR.
export default async function PortfolioSimulationBuilderPage() {
  await requireAuthUser();

  return (
    <div className="space-y-6">
      <PortfolioSimulationBuilderContent />
    </div>
  );
}

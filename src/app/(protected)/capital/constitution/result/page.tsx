import { requireAuthUser } from "@/lib/auth";
import { ConstitutionResultContent } from "./constitution-result-content";

// Intentionally does not create a simulation or trade intent, does not
// connect to any external execution venue, and never calls an LLM. This
// route only reads the already-generated Investor Constitution (handed off
// from
// /capital/constitution/new via sessionStorage — there is no server-side
// persistence for constitutions yet) and evaluates it against the existing
// Strategy Registry and Suitability Consistency Engine.
export default async function InvestorConstitutionResultPage() {
  await requireAuthUser();

  return (
    <div className="space-y-6">
      <ConstitutionResultContent />
    </div>
  );
}

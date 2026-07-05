import { requireAuthUser } from "@/lib/auth";
import { INTRO_PARAGRAPHS } from "@/lib/capital/investor-constitution-intake-content";
import { InvestorConstitutionIntakeForm } from "./investor-constitution-intake-form";

// Intentionally does not create a simulation, recommend a strategy, or call
// the LLM — this route only produces an Investor Constitution from a short,
// plain-language questionnaire. Strategy eligibility is a later PR.
export default async function InvestorConstitutionIntakePage() {
  await requireAuthUser();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">AOC Capital — Investor Constitution</p>
        <h2 className="mt-1 text-xl font-semibold text-white">Build your Investor Constitution</h2>
        <div className="mt-3 max-w-3xl space-y-3 text-sm text-slate-300">
          {INTRO_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>

      <InvestorConstitutionIntakeForm />
    </div>
  );
}

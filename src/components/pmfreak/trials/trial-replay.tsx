import type { TrialEvaluation, TrialScenario } from "@/lib/trials/trial-model";

export function TrialReplay({ scenario, evaluation, trustState }: { scenario: TrialScenario; evaluation: TrialEvaluation; trustState: string }) {
  return <article className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm"><h4 className="font-semibold text-white">{scenario.title}</h4><p className="text-slate-300">Scenario: {scenario.prompt}</p><p className="text-slate-200">PM response: {evaluation.pmResponse}</p><p className="text-slate-200">PMFreak response: {evaluation.pmfreakResponse}</p><p className="text-slate-300">Trust state: {trustState}</p><p className="text-slate-400">Notes: {evaluation.notes ?? "-"}</p></article>;
}

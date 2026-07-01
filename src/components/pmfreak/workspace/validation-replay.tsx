import type { ValidationTrace } from "@/lib/workspace/runtime-validation";
import { VALIDATION_CONFIDENCE_LABELS } from "@/lib/workspace/validation-trace-builder";

const SOURCE_ABBREV: Record<string, string> = {
  conversation: "Conv",
  memory: "Mem",
  awakening: "Awake",
  imprint: "Imprint",
  delivery: "Delivery",
  stakeholders: "Stakeholders",
  risk: "Risk",
  navigation: "Nav",
};

type Props = {
  traces: ValidationTrace[];
};

export function ValidationReplay({ traces }: Props) {
  const recent = [...traces].reverse().slice(0, 8);

  return (
    <details className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-3 text-xs">
      <summary className="cursor-pointer select-none text-[9px] uppercase tracking-[0.28em] text-zinc-600">
        Validation Replay
      </summary>
      {recent.length === 0 ? (
        <p className="mt-2 text-[11px] text-zinc-700">No traces recorded yet</p>
      ) : (
        <div className="mt-3 space-y-3">
          {recent.map((trace, idx) => (
            <div
              key={trace.traceId}
              className="rounded-xl border border-white/[0.04] bg-slate-950/30 p-2.5 space-y-1.5"
            >
              <p className="text-[9px] uppercase tracking-widest text-zinc-600">
                Trace #{traces.length - idx}
              </p>

              {trace.triggerSummary ? (
                <div>
                  <span className="text-zinc-600">Input: </span>
                  <span className="text-slate-500">{trace.triggerSummary.slice(0, 72)}</span>
                </div>
              ) : null}

              {trace.activeSources.length > 0 ? (
                <div>
                  <span className="text-zinc-600">Runtime: </span>
                  <span className="text-slate-500">
                    {trace.activeSources.map((s) => SOURCE_ABBREV[s] ?? s).join(" + ")}
                  </span>
                </div>
              ) : null}

              <div>
                <span className="text-zinc-600">Confidence: </span>
                <span className="text-violet-300/70">{VALIDATION_CONFIDENCE_LABELS[trace.confidence]}</span>
              </div>

              {trace.outputBias ? (
                <div>
                  <span className="text-zinc-600">Output bias: </span>
                  <span className="text-slate-500">{trace.outputBias}</span>
                </div>
              ) : null}

              {trace.feedbackState ? (
                <div>
                  <span className="text-zinc-600">Feedback: </span>
                  <span className={trace.feedbackState === "aligned" ? "text-emerald-400/60" : "text-amber-400/60"}>
                    {trace.feedbackState === "aligned" ? "Runtime aligned" : "Needs recalibration"}
                  </span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </details>
  );
}

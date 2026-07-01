type InsightType = "info" | "warning" | "attention" | "confidence";

const INSIGHT_STYLES: Record<InsightType, { border: string; bg: string; text: string; badge: string }> = {
  info:       { border: "border-indigo-300/20", bg: "bg-indigo-300/[0.05]", text: "text-indigo-200/90",  badge: "text-indigo-400"  },
  warning:    { border: "border-amber-300/20",  bg: "bg-amber-300/[0.05]",  text: "text-amber-200/90",   badge: "text-amber-400"   },
  attention:  { border: "border-violet-300/20", bg: "bg-violet-300/[0.05]", text: "text-violet-200/90",  badge: "text-violet-400"  },
  confidence: { border: "border-emerald-300/20",bg: "bg-emerald-300/[0.05]",text: "text-emerald-200/90", badge: "text-emerald-400" },
};

export function AmbientAIInsight({
  insight,
  type = "info",
  className = "",
}: {
  insight: string;
  type?: InsightType;
  className?: string;
}) {
  const s = INSIGHT_STYLES[type];
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 ${s.border} ${s.bg} ${className}`}>
      <span className={`mt-px shrink-0 text-[9px] font-bold uppercase tracking-widest ${s.badge}`}>AI</span>
      <p className={`text-[11px] leading-relaxed ${s.text}`}>{insight}</p>
    </div>
  );
}

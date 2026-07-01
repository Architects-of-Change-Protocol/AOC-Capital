type PillVariant = "active" | "standby" | "warning" | "critical";

const PILL_STYLES: Record<PillVariant, { dot: string; border: string; text: string }> = {
  active:   { dot: "bg-emerald-400", border: "border-emerald-300/30 bg-emerald-300/[0.08]", text: "text-emerald-100" },
  standby:  { dot: "bg-zinc-400",    border: "border-zinc-300/25 bg-zinc-300/[0.06]",       text: "text-zinc-300"   },
  warning:  { dot: "bg-amber-400",   border: "border-amber-300/30 bg-amber-300/[0.08]",     text: "text-amber-100"  },
  critical: { dot: "bg-red-400",     border: "border-red-300/30 bg-red-300/[0.08]",         text: "text-red-100"    },
};

export function LiveSignalPill({
  label,
  variant = "active",
}: {
  label: string;
  variant?: PillVariant;
}) {
  const s = PILL_STYLES[variant];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${s.border} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} motion-safe:animate-pulse`} />
      {label}
    </span>
  );
}

type StatusVariant = "active" | "monitoring" | "standby" | "degraded";

const STATUS_CONFIG: Record<StatusVariant, { label: string; dot: string; border: string; text: string; bg: string }> = {
  active:     { label: "Operational Intelligence Active", dot: "bg-emerald-400", border: "border-emerald-300/35", text: "text-emerald-100", bg: "bg-emerald-300/10" },
  monitoring: { label: "Agents Monitoring",              dot: "bg-cyan-400",    border: "border-cyan-300/35",    text: "text-cyan-100",    bg: "bg-cyan-300/10"    },
  standby:    { label: "Agents on Standby",              dot: "bg-zinc-400",    border: "border-zinc-300/30",    text: "text-zinc-300",    bg: "bg-zinc-300/[0.08]" },
  degraded:   { label: "Partial Connectivity",           dot: "bg-amber-400",   border: "border-amber-300/35",   text: "text-amber-100",   bg: "bg-amber-300/10"   },
};

export function OperationalStatusBadge({ status }: { status: StatusVariant }) {
  const c = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${c.border} ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot} motion-safe:animate-pulse`} />
      {c.label}
    </span>
  );
}

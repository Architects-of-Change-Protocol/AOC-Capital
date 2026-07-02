"use client";

import { useState } from "react";

export function StrategyDetailsToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-200/30 hover:bg-cyan-300/[0.07] hover:text-cyan-100"
      >
        {open ? "Hide Details" : "View Details"}
      </button>
      {open ? <div className="mt-4 space-y-3">{children}</div> : null}
    </div>
  );
}

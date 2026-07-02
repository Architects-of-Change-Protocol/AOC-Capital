"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DemoLoadButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/capital/demo/load", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Unable to load the demo scenario.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={load}
        className="rounded-full border border-emerald-300/30 bg-emerald-300/[0.1] px-5 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-300/[0.2] disabled:opacity-50"
      >
        {pending ? "Loading demo scenario…" : "Load Demo Scenario"}
      </button>
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </div>
  );
}

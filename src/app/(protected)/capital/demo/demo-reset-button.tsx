"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DemoResetButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/capital/demo/reset", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Unable to reset the demo scenario.");
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-full border border-rose-300/30 bg-rose-300/[0.08] px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-300/[0.16]"
      >
        Reset Demo
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-300">Delete only this demo&apos;s trade intents, positions, and audit events?</span>
        <button
          type="button"
          disabled={pending}
          onClick={reset}
          className="rounded-full border border-rose-300/30 bg-rose-300/[0.08] px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-300/[0.16] disabled:opacity-50"
        >
          {pending ? "Resetting…" : "Confirm Reset"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-200/30 hover:text-cyan-100 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </div>
  );
}

"use client";

export default function ProjectFollowUpError({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-rose-100">
      <p>Project follow-up failed to load.</p>
      <button onClick={reset} className="mt-2 rounded border border-rose-300/50 px-3 py-1">Retry</button>
    </div>
  );
}

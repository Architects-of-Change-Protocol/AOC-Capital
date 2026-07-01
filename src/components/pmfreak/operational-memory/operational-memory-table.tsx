"use client";

import type { OperationalMemoryEntry } from "@/lib/operational-memory-v1";

export function OperationalMemoryTable({ records }: { records: OperationalMemoryEntry[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/20">
      <table className="min-w-full text-left text-xs md:text-sm">
        <thead className="border-b border-white/10 text-slate-300">
          <tr>
            <th className="px-3 py-2">Type</th><th className="px-3 py-2">Memory</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Captured</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-white/5 align-top">
              <td className="px-3 py-2 uppercase text-cyan-200">{r.memoryType.replaceAll("_", " ")}</td>
              <td className="px-3 py-2">{r.memoryText}</td>
              <td className="px-3 py-2">{r.status}</td>
              <td className="px-3 py-2 text-slate-300">{r.sourceType}: {r.sourceReference}</td>
              <td className="px-3 py-2 text-slate-400">{new Date(r.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

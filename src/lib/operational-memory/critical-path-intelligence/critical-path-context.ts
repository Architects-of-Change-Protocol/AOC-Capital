import { loadOperationalMemoryRecords } from "../runtime-memory-persistence";
import type { CriticalPathContext, CriticalPathRequest } from "./critical-path-types";

export async function buildCriticalPathContext(request: CriticalPathRequest): Promise<CriticalPathContext> {
  const nowMs = request.now ? Date.parse(request.now) : Date.now();
  const records = await loadOperationalMemoryRecords(request.scope, { limit: request.limit ?? 80 });
  return { scope: request.scope, nowMs: Number.isNaN(nowMs) ? Date.now() : nowMs, records };
}

export type GatewayTraceEvent = {
  moduleId: string;
  mode: string;
  projectId: string | null;
  durationMs: number;
  outcome: "success" | "fallback" | "error";
  fallbackReason?: string;
  errorMessage?: string;
  memoryEventCount: number;
  memoryProjectCount: number;
};

export function traceGatewayCall(event: GatewayTraceEvent): void {
  try {
    console.info("[gateway]", event);
  } catch {
    // never throws
  }
}

export function traceGatewayError(moduleId: string, mode: string, error: unknown): void {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[gateway]", { moduleId, mode, errorMessage });
  } catch {
    // never throws
  }
}

export async function measureAsync<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = Date.now();
  const result = await fn();
  const durationMs = Date.now() - start;
  return { result, durationMs };
}

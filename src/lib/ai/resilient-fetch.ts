export type OpenAIErrorClass =
  | "rate_limited"
  | "server_error"
  | "network_error"
  | "timeout"
  | "auth_error"
  | "bad_request"
  | "unknown";

export type ResilientFetchResult<T> =
  | { ok: true; data: T; attempts: number; durationMs: number }
  | { ok: false; errorClass: OpenAIErrorClass; message: string; attempts: number; durationMs: number };

export type ResilientFetchOptions = {
  timeoutMs?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
  retryDelayMultiplier?: number;
  idempotencyKey?: string;
  operationName?: string;
};

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404]);

export function classifyError(status?: number, error?: unknown): OpenAIErrorClass {
  if (error !== undefined) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) return "timeout";
    if (error instanceof TypeError) return "network_error";
  }
  if (status === 429) return "rate_limited";
  if (status === 500 || status === 503) return "server_error";
  if (status === 401) return "auth_error";
  if (status === 400) return "bad_request";
  return "unknown";
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function domainOnly(url: string): string {
  try {
    return new URL(url).hostname; // domain only, not full URL
  } catch {
    return "<invalid-url>";
  }
}

// Compose two AbortSignals without AbortSignal.any() for Node 20 compatibility
function combineSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (typeof (AbortSignal as { any?: unknown }).any === "function") {
    return (AbortSignal as { any: (signals: AbortSignal[]) => AbortSignal }).any([a, b]);
  }
  const controller = new AbortController();
  if (a.aborted || b.aborted) {
    controller.abort();
    return controller.signal;
  }
  const abort = () => controller.abort();
  a.addEventListener("abort", abort, { once: true });
  b.addEventListener("abort", abort, { once: true });
  return controller.signal;
}

export async function resilientFetch<T>(
  url: string,
  init: RequestInit,
  options?: ResilientFetchOptions
): Promise<ResilientFetchResult<T>> {
  const {
    timeoutMs = 25000,
    maxAttempts = 3,
    retryDelayMs = 500,
    retryDelayMultiplier = 2,
    idempotencyKey,
    operationName = "unknown",
  } = options ?? {};

  const domain = domainOnly(url);
  const startTime = Date.now();
  let lastErrorClass: OpenAIErrorClass = "unknown";
  let lastMessage = "Unknown error.";

  const extraHeaders: Record<string, string> = {};
  if (idempotencyKey) {
    extraHeaders["Idempotency-Key"] = idempotencyKey;
  }

  const existingSignal = init.signal instanceof AbortSignal ? init.signal : undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.info("[resilient-fetch] attempt", { operationName, attempt, url: domain });

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    const signal = existingSignal ? combineSignals(existingSignal, controller.signal) : controller.signal;

    let response: Response | undefined;
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          ...(init.headers as Record<string, string> | undefined),
          ...extraHeaders,
        },
        signal,
      });
      clearTimeout(timeoutHandle);
    } catch (error) {
      clearTimeout(timeoutHandle);
      lastErrorClass = classifyError(undefined, error);
      lastMessage = error instanceof Error ? error.message : "Network error.";

      const isRetryable = lastErrorClass === "timeout" || lastErrorClass === "network_error";
      if (!isRetryable || attempt >= maxAttempts) {
        const durationMs = Date.now() - startTime;
        console.error("[resilient-fetch] failed", { operationName, attempts: attempt, errorClass: lastErrorClass, durationMs });
        return { ok: false, errorClass: lastErrorClass, message: lastMessage, attempts: attempt, durationMs };
      }

      const delay = retryDelayMs * Math.pow(retryDelayMultiplier, attempt - 1);
      console.warn("[resilient-fetch] retry", { operationName, attempt, errorClass: lastErrorClass, delayMs: delay });
      await sleep(delay);
      continue;
    }

    if (response.ok) {
      let data: T;
      try {
        data = (await response.json()) as T;
      } catch {
        const durationMs = Date.now() - startTime;
        console.error("[resilient-fetch] failed", { operationName, attempts: attempt, errorClass: "server_error", durationMs });
        return { ok: false, errorClass: "server_error", message: "Failed to parse response JSON.", attempts: attempt, durationMs };
      }
      const durationMs = Date.now() - startTime;
      if (attempt > 1) {
        console.info("[resilient-fetch] recovered", { operationName, attempts: attempt, durationMs });
      }
      return { ok: true, data, attempts: attempt, durationMs };
    }

    // Non-2xx response
    lastErrorClass = classifyError(response.status);
    let bodyText = "";
    try {
      const bodyJson = (await response.json()) as { error?: { message?: string } };
      bodyText = bodyJson.error?.message ?? `HTTP ${response.status}`;
    } catch {
      bodyText = `HTTP ${response.status}`;
    }
    lastMessage = bodyText;

    if (NON_RETRYABLE_STATUSES.has(response.status)) {
      const durationMs = Date.now() - startTime;
      console.error("[resilient-fetch] failed", { operationName, attempts: attempt, errorClass: lastErrorClass, durationMs });
      return { ok: false, errorClass: lastErrorClass, message: lastMessage, attempts: attempt, durationMs };
    }

    if (!RETRYABLE_STATUSES.has(response.status) || attempt >= maxAttempts) {
      const durationMs = Date.now() - startTime;
      console.error("[resilient-fetch] failed", { operationName, attempts: attempt, errorClass: lastErrorClass, durationMs });
      return { ok: false, errorClass: lastErrorClass, message: lastMessage, attempts: attempt, durationMs };
    }

    // Retryable: compute delay with exponential backoff
    let delay = retryDelayMs * Math.pow(retryDelayMultiplier, attempt - 1);
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      if (retryAfter) {
        const retryAfterMs = parseFloat(retryAfter) * 1000;
        if (!isNaN(retryAfterMs)) {
          delay = Math.min(retryAfterMs, 30000);
        }
      }
    }

    console.warn("[resilient-fetch] retry", { operationName, attempt, errorClass: lastErrorClass, delayMs: delay });
    await sleep(delay);
  }

  const durationMs = Date.now() - startTime;
  console.error("[resilient-fetch] failed", { operationName, attempts: maxAttempts, errorClass: lastErrorClass, durationMs });
  return { ok: false, errorClass: lastErrorClass, message: lastMessage, attempts: maxAttempts, durationMs };
}

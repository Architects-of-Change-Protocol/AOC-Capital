# Orchestration Resilience

## Overview

All OpenAI API calls in PMFreak are routed through `src/lib/ai/resilient-fetch.ts`, which adds per-attempt timeouts, exponential backoff retry, idempotency keys, and structured error classification.

---

## Callsites and Budgets

| Callsite | File | `timeoutMs` | `maxAttempts` | `retryDelayMs` | `operationName` |
|---|---|---|---|---|---|
| Copilot | `src/app/api/copilot/route.ts` | 25 000 ms | 2 | 1 000 ms | `copilot` |
| Message nudges | `src/lib/ai/gateway/gateway.ts` | 20 000 ms | 3 | 500 ms | `message-nudges` |
| Meta intelligence | `src/app/api/ai/meta-intelligence/route.ts` | 15 000 ms | 2 | 800 ms | `meta-intelligence` |

### Why different `maxAttempts` per callsite

**Copilot (2 attempts):** User is waiting synchronously. A second attempt is justified for transient failures; a third would push total latency above 50 s under worst-case timeout stacking, degrading perceived quality.

**Message nudges (3 attempts):** Called from a background gateway module. Callers handle thrown errors gracefully and users are not blocked on a synchronous response, so an extra retry is safe.

**Meta intelligence (2 attempts):** Simpler prompt, shorter budget. Two attempts fits within a 30 s total budget with a 15 s timeout per attempt.

---

## Exponential Backoff Formula

```
delay = retryDelayMs × (retryDelayMultiplier ^ (attempt - 1))
```

With defaults (`retryDelayMs=500`, `retryDelayMultiplier=2`):

| Attempt | Delay before next attempt |
|---|---|
| 1 → retry | 500 ms |
| 2 → retry | 1 000 ms |
| 3 → retry | 2 000 ms |

For 429 responses, the `Retry-After` header overrides the computed delay, capped at 30 000 ms.

---

## Idempotency Key

Each call to `resilientFetch` receives a `randomUUID()` generated at the time the request is constructed. This key is sent as the `Idempotency-Key` HTTP header, which allows OpenAI to deduplicate requests that arrive more than once due to client retries.

**Why per-request (not per-session):** A per-session key would cause OpenAI to return a cached response for every message in the session. Each user message is a distinct operation with distinct inputs, so idempotency must be scoped to a single fetch call, not the whole session.

---

## Error Classification

| HTTP Status | `errorClass` | Client response code |
|---|---|---|
| 429 | `rate_limited` | 429 |
| 500 | `server_error` | 502 |
| 502 | `server_error` (retried) | 502 |
| 503 | `server_error` | 502 |
| 504 | `server_error` (retried) | 502 |
| 401 | `auth_error` | 502 |
| 400 | `bad_request` | 502 |
| Network error (TypeError) | `network_error` | 502 |
| AbortController fired | `timeout` | 502 |
| Other | `unknown` | 502 |

---

## What Is NOT Retried

- **400 Bad Request:** Non-transient. The request body is malformed; retrying with the same payload will produce the same result.
- **401 Unauthorized:** The API key is invalid or missing. Retrying does not fix authentication.
- **403 Forbidden:** The caller lacks permission. Retrying does not escalate access.

These statuses return immediately on first occurrence without waiting for `maxAttempts`.

---

## Residual Risk

**No streaming:** All OpenAI responses are fully buffered before parsing. Streaming responses (chunked transfer encoding) are not implemented. The timeout budget must cover the full round-trip including generation time.

**No circuit breaker:** A circuit breaker would require shared state across serverless function instances (e.g. Redis or a global in-memory counter). This is not currently wired. Under sustained OpenAI outages, each request still attempts the full retry sequence independently.

---

## Gateway Tracing

All module invocations through `runAIModule` are now traced via `src/lib/ai/gateway/tracer.ts`.

### Three execution paths and their tracing behaviour

| Path | Condition | Tracing |
|---|---|---|
| `openai` (message-nudges) | `moduleConfig.mode === "openai"` and `moduleId === "message-nudges"` | `traceGatewayCall` with `mode: "openai"`, `durationMs: 0`, `outcome: "success"` |
| `openai` (other modules) | `moduleConfig.mode === "openai"` and `moduleId !== "message-nudges"` | Falls back to mock handler; traced with `mode: "openai_fallback_mock"`, `outcome: "fallback"`, `fallbackReason: "openai_not_implemented"` |
| `hybrid` | `moduleConfig.mode === "hybrid"` | Falls back to mock handler; traced with `mode: "hybrid_fallback_mock"`, `outcome: "fallback"`, `fallbackReason: "hybrid_not_implemented"` |
| `mock` | All other modules | Traced with actual `durationMs`, `outcome: "success"` |

### Fallback strategy

Modules whose mode is `"openai"` (but is not `message-nudges`) or `"hybrid"` do **not** throw. Instead they fall back to the module's mock handler and emit a `console.warn` with a structured payload. This allows new modules to be added to the registry with a forward-looking mode before the implementation is complete, without breaking callers.

### Why `durationMs: 0` for the message-nudges openai path

The `resilientFetch` call inside the message-nudges path already emits `[resilient-fetch]` structured log events that include the full round-trip duration per attempt. Adding a second wall-clock measurement around the same code would double-count the duration. `durationMs: 0` is an explicit marker meaning "measured elsewhere."

### `traceId` for request correlation

`RunAIModuleInput` accepts an optional `traceId?: string` field. API routes can populate this with a `randomUUID()` at request ingress and pass it through to `runAIModule`. This allows log aggregation tools to correlate all `[gateway]` events belonging to a single HTTP request without changing existing callers (the field is optional).

### Remaining gaps

- **No circuit breaker:** per-module failure counts are not tracked; a failing module still attempts every invocation.
- **No per-module rate limiting:** a noisy module cannot be throttled independently of others.

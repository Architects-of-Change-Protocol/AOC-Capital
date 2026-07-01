# Data Contracts

## Why runtime validation matters

TypeScript types are erased at compilation. At runtime, there are no guarantees that the shape of data arriving from external sources (AI APIs, HTTP request bodies, Supabase rows) matches the declared TypeScript types. A cast like `JSON.parse(content) as Partial<CopilotResponse>` does not validate anything — it is a compile-time assertion, not a runtime check.

Without runtime validation:
- Malformed AI responses silently corrupt downstream state
- Invalid request bodies reach business logic untouched
- Supabase rows with schema drift pass through as if valid
- Security boundaries relying on type contracts can be bypassed

## The 5 canonical contracts

All contracts live in `src/lib/contracts/index.ts`.

### CONTRACT 1 — `CopilotRequestContract`

**Protects:** `/api/copilot` request body  
**Behavior:** Fail-hard. Invalid request → 400 `INVALID_REQUEST`.  
**Validates:** `message` (non-empty string), `projectId` (max 100 chars), `projectName` (max 200 chars), `companyId`, `role` (enum), `methodology` (enum).

### CONTRACT 2 — `CopilotResponseContract`

**Protects:** AI-generated JSON before it enters `buildPmNativeResponse`  
**Behavior:** Fail-soft via `partial()`. Invalid or missing fields are dropped, not errored. The route continues with whatever was valid.  
**Validates:** `answer`, `diagnosis`/`immediateAction`/`reinforcement`/`nextStep` (truncated to 500 chars), `facts`/`bestPractices`/`assumptions` (each item max 300 chars, empty items filtered), `cards` (max 5, each card shape-checked), `requiresMoreContext`, `contextGapQuestions` (max 5 items).

### CONTRACT 3 — `OperationalMemoryEntryContract`

**Protects:** Supabase rows read from `operational_memory_entries`  
**Behavior:** Fail-hard (intended for use at read callsites).  
**Validates:** All fields of `OperationalMemoryEntry` including enum constraints on `memoryType`, `status`, `sourceType`, and 1–2000 char bounds on `memoryText`.

### CONTRACT 4 — `OperationalMemoryCandidateContract`

**Protects:** Candidates produced by `extractOperationalMemoryCandidates` before they are persisted via `appendOperationalMemory`  
**Behavior:** Fail-hard per-candidate (invalid entries are filtered out, valid ones pass through).  
**Validates:** Same shape as the extractor output, including a minimum 14-char `memoryText` bound (matching the extractor's own line-length filter).

### CONTRACT 5 — `createAIResponseEnvelopeValidator` (factory)

**Protects:** Generic AI module response envelopes  
**Behavior:** Factory that accepts a data validator and returns a `Validator<{ ok, data, error }>`.  
**Usage:** `createAIResponseEnvelopeValidator(myDataValidator)(responseBody)`

## The validation micro-library

`src/lib/contracts/index.ts` contains a zero-dependency micro-library. Core primitives:

| Primitive | Returns |
|---|---|
| `string(field)` | `Validator<string>` |
| `nonEmptyString(field)` | `Validator<string>` — fails on empty after trim |
| `optionalString(field)` | `Validator<string \| null \| undefined>` |
| `stringEnum(field, values)` | `Validator<T>` — fails if not in the enum list |
| `stringArray(field)` | `Validator<string[]>` — fails if any item is not a string |
| `optionalStringArray(field)` | `Validator<string[] \| undefined>` |
| `boolean(field)` | `Validator<boolean>` |
| `object(field, shape)` | `Validator<T>` — fails if any field fails |
| `array(field, itemValidator)` | `Validator<T[]>` — fails if any item fails |
| `nullable(field, inner)` | `Validator<T \| null>` — passes null through |
| `partial(validators)` | `Validator<Partial<T>>` — always `ok: true`, drops failed fields |

All primitives handle `null`, `undefined`, `number`, and `object` inputs without throwing.

## Why no Zod

- **Consistency:** The existing P7 pattern (`src/lib/ai/response-verifier.ts`) uses pure TypeScript with no dependencies. Adding Zod would introduce an inconsistency.
- **No new dependencies:** The codebase has a zero-new-dependency constraint for validation infrastructure.
- **Domain-specific:** These contracts are narrow and domain-specific. They do not need generic schema composition or the full feature set of a schema library.
- **Bundle size:** A micro-library is smaller than any external validation library.

## Integration points

| Callsite | Contract | Behavior |
|---|---|---|
| `src/app/api/copilot/route.ts` — after `request.json()` | `CopilotRequestContract` | Fail-hard → 400 |
| `src/app/api/copilot/route.ts` — after `JSON.parse(content)` | `CopilotResponseContract` | Fail-soft, log, continue |
| `src/lib/operational-memory-v1.ts` — `extractOperationalMemoryCandidates` return | `OperationalMemoryCandidateContract` | Filter invalid candidates |

## `partial()` — fail-soft for AI responses

The `partial()` combinator runs each field validator independently and collects only the fields that pass. It always returns `{ ok: true, data: Partial<T> }`. Fields that fail validation are dropped silently.

This is intentional for AI responses: AI output is opportunistic. A malformed `cards` field should not block delivery of a valid `answer`. The route already has defensive fallbacks (`Array.isArray(x) ? x : []`) that handle missing fields gracefully.

By contrast, request validation uses `object()` which is fail-hard: if any required field is missing or invalid, the entire validation fails and a 400 is returned.

## Residual risk (updated)

**CONTRACT 3** (`OperationalMemoryEntryContract`) is now integrated at both
mapRow callsites in `operational-memory-v1.ts`. Invalid rows are filtered
and logged rather than propagated into application state.

**CONTRACT 6** (`OperationalMemoryRecordContract`) is now integrated at the
`listOperationalMemory` callsite in `aoc/providers/supabase.ts`.

**CONTRACT 7** (`StoredProjectAnalysisContract`) is now integrated at the
`readProjectMemory` callsite in `project-memory.ts`.

Remaining unvalidated read paths:
- `writeProjectMemory` read-before-delete pattern — low risk (delete operation)
- `aoc/providers/supabase.ts` saveOperationalMemory insert return — low risk
  (insert is controlled by the application, not external schema drift)
- `message_analyses` table reads in `gateway.ts` — medium risk, tracked as P12

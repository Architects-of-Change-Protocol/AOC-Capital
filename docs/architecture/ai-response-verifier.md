# AI Response Verifier

## What it does

`src/lib/ai/response-verifier.ts` performs deterministic post-generation verification on copilot responses before they are returned to the client. It runs pure TypeScript logic — no API calls, no async operations — and completes synchronously in under 5ms for typical responses.

The verifier inspects four fields that carry factual claims (`facts[]`, `assumptions[]`, `diagnosis`, `immediateAction`) against the available runtime context (project name, known risks, known dependencies, unresolved operational memory, user message) and produces:

- A list of `VerificationFlag` objects describing what triggered and how severe it is
- A `confidenceScore` (0–100) summarising overall signal quality
- A `passed` boolean for downstream routing decisions
- A `sanitized` copy of the fields with invented names redacted and date-flagged facts removed

The verifier is integrated into `src/app/api/copilot/route.ts` only. `analyze-ai` and `meta-intelligence` are out of scope for this iteration.

---

## The 5 rules

### Rule 1 — `no_project_name_invention`

**Applies to:** `facts[]`, `diagnosis`, `immediateAction`

When `projectName` is null or `"Not specified"`, the verifier extracts Title Case phrases (2+ capitalised words) from each field and checks whether they appear in any known context string. Unknown phrases suggest the model may have invented a project name or product reference.

**Severity:** `warn` — stripping proper nouns is too aggressive without semantic NLP.

**Example trigger:** AI says "Phoenix Initiative is at risk" when no project name exists in context.

---

### Rule 2 — `no_specific_date_invention`

**Applies to:** `facts[]` (strip), `diagnosis` and `immediateAction` (warn)

Detects specific date patterns: month names, ordinals, quarter references (`Q3 2025`), day-of-week with next/last, and numeric date formats. If the user message and unresolved memory contain **no date-like strings**, any date in the response is treated as invented.

**Severity:** `strip` for `facts[]` (item removed from `sanitized.facts`), `warn` for prose fields.

**Example trigger:** AI returns `facts: ["Deadline is March 15"]` when the user asked a generic status question with no dates mentioned.

---

### Rule 3 — `no_invented_stakeholder_name`

**Applies to:** `facts[]`, `assumptions[]`, `immediateAction`

Detects full name patterns (`John Smith`) and department attribution patterns (`Sarah from Finance`). If the detected name does not appear in the user message or unresolved memory, it is replaced with `[stakeholder]` in the sanitized output.

**Severity:** `redact` — the sanitized fields carry the substitution; the original remains in `flags[].detail` for audit.

**Example trigger:** AI says "Contact John Smith by Friday" when no such name exists in context.

---

### Rule 4 — `facts_grounded_in_context`

**Applies to:** `facts[]`

Each fact is tokenised (lowercase, non-word split, stop-word filtered) and checked for at least one keyword overlap with the combined context strings. Facts with zero overlap may be valid general PM knowledge but cannot be verified against the session.

**Severity:** `warn` only — factual completeness without semantic NLP is a P-next concern.

**Example trigger:** AI asserts "Gantt chart alignment is required" when the user and project context mention none of the tokens in that phrase.

---

### Rule 5 — `assumptions_labeled_correctly`

**Applies to:** `assumptions[]`

Each assumption is checked for definitive openers (`The project`, `The team`, `Management has`, `Budget is`) without accompanying hedging language (`assumed`, `likely`, `appears`, `may`, `probably`, `seems`, `unclear`, `pending`, `estimated`, `expected`). Definitive assertions in the assumptions array indicate the model treated uncertain facts as confirmed.

**Severity:** `warn`.

**Example trigger:** `"The project is on track and budget is confirmed"` — opener matches, no hedging present.

---

## Confidence score computation

| Flag severity | Points deducted |
|---|---|
| `warn` | −5 |
| `redact` | −10 |
| `strip` | −15 |

Score starts at 100, clamped to [0, 100].

`passed = true` requires **both**:
1. `confidenceScore >= 60`
2. No `strip`-severity flags (stripped items are removed from `sanitized.facts` but the flag remains in `flags[]`)

A single `strip` flag leaves the score eligible (85) but forces `passed = false`, ensuring any invented date in facts blocks the pass threshold regardless of other signals.

---

## Why fail-open (passed:true on internal error)

If the verifier itself throws an unhandled exception, `verifyAiResponse` catches it and returns `{ passed: true, confidenceScore: 100, flags: [] }` with the original field values in `sanitized`.

This is deliberate. The verifier is a secondary quality control layer, not the primary response gate. A bug in the verifier silently degrading every copilot response would be a worse user-facing outcome than an occasional unverified response slipping through. The verification log (`[ai-verifier]` console.info) provides the audit trail for post-hoc investigation.

---

## Residual risk

The verifier is **deterministic, not semantic**. It cannot detect:

- Factual errors that happen to use real words from context (e.g., misframing a known risk)
- Invented numeric values (percentages, budgets, headcounts) that are not date-like
- Tone or implication errors ("escalate immediately" when context shows low severity)
- Hallucinations that perfectly echo context tokens without being grounded in them

Invented names that appear in the user message or memory pass Rule 3 unchallenged; this is intentional — we cannot distinguish "real" names from "invented" names without ground-truth identity resolution.

---

## Next step (out of scope)

Semantic grounding via retrieval-augmented citation linking: each fact in the response would be matched against a chunk from the project's stored documents, and facts with no retrievable citation would be flagged at a higher severity. This requires embedding infrastructure and is tracked separately.

# Vault Digestive System Architecture

## What It Is

The Vault Digestive System is the semantic processing layer that transforms raw organizational artifacts into structured, evidence-backed operational nutrients.

PMFreak previously stored or read uploaded project information. The digestive system makes it *understand* that information — extracting structured signals, preserving their evidence lineage, scoring their relevance, and allowing them to decay or be reinforced over time.

This is the foundation for persistent organizational cognition.

## Why It Exists

Raw operational artifacts (meeting notes, emails, risk logs, project updates) are dense with signals that matter — blockers, risks, decisions, stakeholder dynamics, governance gaps. Without digestion, these signals are buried in unstructured text. PMFreak can't reason about them, prioritize them, or connect them over time.

The digestive system extracts, scores, and persists these signals as durable nutrients. Future layers (pattern recognition, severity adaptation, behavioral modeling) can then query and reason over the nutrient store rather than re-parsing raw documents.

## Conceptual Pipeline

```
Raw Artifact (VaultRawMaterial)
  │
  ▼
A. Input Normalization
   Cleans text, splits into lines, preserves source metadata
  │
  ▼
B. Entity Extraction (rule-based)
   Identifies people, organizations, blockers, risks, decisions,
   dependencies, dates, commitments, approvals, financial constraints
  │
  ▼
C. Nutrient Candidate Extraction (pattern-based)
   14 signal types: risk, blocker, stakeholder, dependency, decision,
   commitment, delivery_drift, financial_impediment, governance_gap,
   escalation, recovery, ambiguity, contradiction, timeline_pressure
  │
  ▼
D. Evidence Lineage Construction
   Each nutrient gets an evidence record: source artifact ID, source type,
   text excerpt, timestamp, workspace/project scope, confidence basis,
   extraction method
  │
  ▼
E. Nutrient Scoring
   Confidence, severity, freshness, recurrence hint, ambiguity level,
   actionability, evidence strength, decay profile
  │
  ▼
F. Semantic Residue Extraction
   Weak/ambiguous signals that don't meet nutrient threshold:
   vague concerns, unclear dependencies, incomplete stakeholder mentions,
   possible risks, unresolved timeline references, ambiguous ownership
  │
  ▼
G. Persistence
   vault_digestion_runs, vault_nutrients, vault_semantic_residue
   All workspace-scoped with RLS
```

## Evidence Lineage

Every nutrient traces back to its source. The `VaultEvidenceLineage` type captures:

- `sourceArtifactId` — the upload or artifact record ID (if available)
- `sourceType` — what kind of material it came from
- `sourceTitle` — the document title (if known)
- `excerpt` — a short text excerpt (never the full document)
- `timestamp` — when the source was submitted
- `workspaceId` / `projectId` — tenant scope
- `actorUserId` — who submitted it
- `confidenceBasis` — human-readable explanation of why we believe this
- `extractionMethod` — currently always `rule_based`

This allows any future UI or audit layer to answer: *"Why does PMFreak believe this?"*

One nutrient can have multiple evidence records (if reinforced by multiple sources). One evidence record can support multiple nutrients.

## Semantic Residue

Not every signal is strong enough to become a nutrient. Residue captures weak or ambiguous signals:

| Category | Example |
|---|---|
| `vague_concern` | "I'm not sure this is ideal" |
| `unclear_dependency` | "We might need something else first" |
| `incomplete_stakeholder_mention` | "Someone said we should stop" |
| `possible_risk` | "This could become a problem" |
| `unresolved_timeline_reference` | "We'll do it soon" |
| `ambiguous_ownership` | "Somebody needs to own this" |

Residue is preserved but not surfaced as strong signals. It becomes useful when pattern-matching across multiple digestion runs (e.g., repeated vague concerns about the same area may eventually justify a nutrient).

## Decay Semantics

Nutrients don't stay equally relevant forever. The decay system computes how fresh a nutrient currently is:

```
freshness = 0.5^(age_days / half_life_days) + recurrence_boost
```

Decay profiles:

| Profile | Half-life | Used for |
|---|---|---|
| `fast` | 2 days | Timeline pressure, delivery drift, recovery |
| `medium` | 7 days | Risks, decisions, ambiguity, commitment |
| `slow` | 21 days | Blockers, dependencies, stakeholder signals |
| `persistent` | 90 days | Financial impediments, governance gaps |

Recovery multiplies freshness by 0.33 (recovered issues become irrelevant faster).
Each recurrence adds up to 30% freshness boost (capped).

## Persistence Model

Three tables, all workspace-scoped with RLS:

**`vault_digestion_runs`** — one record per `digestVaultMaterial()` call
- Tracks: workspace, project, actor, raw material reference, counts, timestamps

**`vault_nutrients`** — extracted semantic nutrients
- Stores: nutrient type, summary, entities (JSONB), evidence (JSONB), scoring (JSONB)
- Indexed by workspace+type and workspace+project

**`vault_semantic_residue`** — weak/unresolved signals
- Stores: category, raw excerpt, rationale

All tables use `is_workspace_member()` for RLS. Project-level scoping is optional — workspace-only digestion is valid.

## AOC / Runtime Governance Alignment

The digestive system does not perform its own authorization checks. This matches the existing codebase pattern where service functions receive pre-authorized context.

**Before calling `digestVaultMaterial()`**, API routes must call:
- `requireWorkspaceMembership(workspaceId)` for workspace-level digestion
- `requireProjectPermission(projectId, "write_memory")` for project-scoped digestion

The `actorUserId` in the digestive context is preserved in every nutrient, evidence record, and digestion run, enabling full auditability.

Digestion is designed as **runtime-governed cognition** — it does not create or modify memory outside the AOC-authorized request scope.

## Integration Surface

```typescript
import { digestVaultMaterial } from "@/lib/vault/digestive";

// In an API route, after access verification:
const result = await digestVaultMaterial(
  {
    workspaceId,      // required
    projectId,        // null if workspace-only
    actorUserId,      // the verified user
  },
  {
    id: uploadId,     // source artifact id (or null)
    type: "uploaded_text",
    title: fileName,
    content: extractedText,
    workspaceId,
    projectId,
    actorUserId,
    sourceRef: `${userId}:upload`,
    submittedAt: new Date().toISOString(),
  },
  { persist: true },  // default: true
);

result.nutrients;          // VaultNutrient[]
result.residue;            // VaultSemanticResidue[]
result.entities;           // VaultExtractedEntity[]
result.digestivePass;      // VaultDigestivePass (run metadata)
result.persisted;          // boolean — whether Supabase insert succeeded
result.persistError;       // string | undefined — if persistence failed
```

## AI Availability

The pipeline is **fully deterministic**. It does not call AI providers. All extraction is rule-based and pattern-matched.

This means:
- Digestion works when OpenAI is unavailable
- Results are reproducible and auditable
- No hallucination risk in the extraction layer
- Future prompts can layer AI enhancement on top without breaking the substrate

## Future Extension Points

1. **Recurrence detection** — query vault_nutrients for same workspace+type before inserting; bump recurrence count
2. **AI enhancement pass** — optional second pass using the AI gateway to refine summaries and scoring
3. **Cross-run pattern recognition** — identify nutrients that appear repeatedly across digestion runs
4. **Nutrient consolidation** — merge related nutrients from different sources into a canonical view
5. **Decay-aware recall surface** — query nutrients sorted by `computeCurrentRelevance()` for copilot context injection
6. **Residue graduation** — promote residue to nutrients when enough supporting evidence accumulates

## Files

```
src/lib/vault/digestive/
  types.ts            — All core types/interfaces
  normalizer.ts       — Input normalization
  entity-extractor.ts — Rule-based entity extraction
  nutrient-extractor.ts — Pattern-based nutrient extraction
  scoring.ts          — Nutrient scoring defaults
  decay.ts            — Decay and relevance computation
  residue.ts          — Semantic residue extraction
  lineage.ts          — Evidence lineage construction
  pipeline.ts         — Deterministic pipeline (pure, synchronous)
  persistence.ts      — Supabase persistence with graceful fallback
  index.ts            — digestVaultMaterial() integration surface

supabase/migrations/
  20260520000000_vault_digestive_system.sql

tests/
  vault-digestive-system-contract.test.mjs

docs/architecture/
  vault-digestive-system.md  ← this file
```

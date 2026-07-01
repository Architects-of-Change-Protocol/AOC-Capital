# AOC Multi-Repo Extraction Plan (Protocol + Enterprise)

## Objective
Create a controlled extraction path for reusable AOC assets into:
- `Architects-of-Change-Protocol`
- `AOC-Enterprise`

…while preserving PMFreak runtime stability and compatibility during transition.

## Audit scope covered
- `src/aoc/protocol/**`
- `src/aoc/enterprise/**`
- `src/lib/security/**`
- `src/lib/api/**`
- `src/sdk/**`
- `supabase/migrations/*` related to capabilities, policies, agents, audit, delegations
- `docs/architecture/**`
- `docs/api/**`
- `docs/sdk/**` (not present)
- `docs/quickstart*` (not present)

## Classification & migration map

### Legend
- **Target**: Protocol / Enterprise / PMFreak
- **Disposition**: move / copy then shim / shared temporarily / do not move yet

| Path | Classification | Target | Disposition | Reason |
|---|---|---|---|---|
| `src/aoc/protocol/index.ts` | Protocol contract surface | Protocol | move | Protocol API barrel should live with protocol contracts. |
| `src/aoc/protocol/contracts/capability-claims.ts` | Capability claim semantics + verification contract | Protocol | copy then shim | Contract should move first; current implementation depends on PMFreak security modules and needs compatibility wrappers. |
| `src/aoc/enterprise/index.ts` | Enterprise runtime exports | Enterprise | move | Runtime package boundary belongs to enterprise repo. |
| `src/aoc/enterprise/runtime/policy-engine.ts` | Policy runtime | Enterprise | copy then shim | Enterprise runtime implementation concern. |
| `src/aoc/enterprise/runtime/execution-grants.ts` | Capability runtime (grants) | Enterprise | copy then shim | Runtime and persistence coupling to Supabase. |
| `src/aoc/enterprise/runtime/delegated-capabilities.ts` | Delegation runtime | Enterprise | copy then shim | Runtime behavior, not protocol contract. |
| `src/lib/api/http.ts` | API transport helpers | Enterprise | shared temporarily | Used broadly by PM APIs; extract to enterprise package then keep PM adapter imports. |
| `src/lib/api/reliability.ts` | Reliability layer | Enterprise | shared temporarily | Explicit enterprise ownership, but PM endpoints currently depend on it. |
| `src/lib/api/validation.ts` | API validation helpers | Enterprise | shared temporarily | Shared until PM-specific APIs decouple. |
| `src/lib/api/error-codes.ts` | API interface codes | Protocol | shared temporarily | Interface contract belongs in protocol package; runtime mapping stays enterprise/PM temporarily. |
| `src/lib/security/capability-claims.ts` | re-export alias | PMFreak | do not move yet | Compatibility shim exporting protocol module. |
| `src/lib/security/policy-engine.ts` | re-export alias | PMFreak | do not move yet | Backward-compatible import path for PM runtime callers. |
| `src/lib/security/execution-grants.ts` | re-export alias | PMFreak | do not move yet | Backward-compatible import path. |
| `src/lib/security/delegated-capabilities.ts` | re-export alias | PMFreak | do not move yet | Backward-compatible import path. |
| `src/lib/security/access-guards.ts` | PM/enterprise auth integration | PMFreak | do not move yet | Deeply coupled to PM roles and route authorization. |
| `src/lib/security/server-authorization.ts` | PM auth integration | PMFreak | do not move yet | PM app auth context and server-route semantics. |
| `src/lib/security/deny-response.ts` | PM API response shaping | PMFreak | stay | PM-facing denial response UX. |
| `src/lib/security/rbac.ts` | Role model core | Protocol | copy then shim | Actor/permission semantics are protocol-level; PM role nuances remain local initially. |
| `src/lib/security/trust-domains.ts` | Trust model runtime + storage | Enterprise | copy then shim | Runtime resolver over Supabase + policy storage. |
| `src/lib/security/trust-coordination.ts` | Distributed trust runtime | Enterprise | copy then shim | Runtime/event import and revocation handling. |
| `src/lib/security/trust-handshakes.ts` | Handshake runtime | Enterprise | copy then shim | Runtime workflow + persistence. |
| `src/lib/security/deterministic-verification.ts` | Verification runtime | Enterprise | copy then shim | Runtime receipt/snapshot processing. |
| `src/lib/security/independent-verifier.ts` | Verifier runtime | Enterprise | copy then shim | Runtime verifier path. |
| `src/lib/security/privileged-access.ts` | Service-role access runtime | Enterprise | copy then shim | Infrastructure/runtime concern. |
| `src/lib/security/telemetry.ts` | Security audit runtime | Enterprise | copy then shim | Runtime event logging pipeline. |
| `src/lib/security/governance-runtime.ts` | Governance runtime orchestration | Enterprise | copy then shim | Explicit runtime layer. |
| `src/lib/security/agent-access.ts` | Agent runtime policy eval | Enterprise | copy then shim | Enterprise runtime capability. |
| `src/lib/security/agent-attestation.ts` | Agent attestation runtime | Enterprise | copy then shim | Runtime verification and authz. |
| `src/lib/security/capability-flow.ts` | Capability request/grant runtime | Enterprise | copy then shim | Enterprise API/runtime/persistence layer. |
| `docs/architecture/aoc-layering.md` | Architectural contract | Protocol | copy | Canonical layering spec belongs to protocol; enterprise keeps implementation addendum. |
| `docs/architecture/persistent-conversational-memory.md` | PM product architecture | PMFreak | stay | PM feature architecture, not core AOC protocol/runtime. |
| `docs/api/api-v1-structure.md` | API contract + route map | Protocol + Enterprise | shared temporarily | Split into protocol API contract + enterprise implementation mapping. |
| `docs/api/api-inventory.md` | Endpoint/runtime inventory | Enterprise | copy | Runtime inventory tracks implementation. |
| `src/sdk/types.ts` | SDK interface contracts | Protocol | move | Contract-first surface. |
| `src/sdk/index.ts` | SDK public entry | Protocol + Enterprise | shared temporarily | Keep stable import surface while internal impl split occurs. |
| `src/sdk/client.ts` | SDK implementation | Enterprise | move | Runtime HTTP behavior and auth handling. |
| `src/sdk/errors.ts` | SDK error taxonomy | Protocol | copy then shim | Error contract belongs in protocol package. |
| `src/sdk/README.md` | SDK usage docs | Protocol + Enterprise | shared temporarily | Split: contract docs in protocol, runtime examples in enterprise. |
| `src/sdk/examples/basic.ts` | SDK runnable example | Enterprise | copy | Implementation-driven example. |
| `supabase/migrations/20260514120000_capability_request_flow.sql` | capability requests/grants/audit | Enterprise | move | Persistence/runtime schema. |
| `supabase/migrations/20260514170000_policy_evaluation_engine_v1.sql` | policy engine persistence | Enterprise | move | Runtime policy storage/eval. |
| `supabase/migrations/20260514190000_delegation_chain_v1.sql` | delegation runtime schema | Enterprise | move | Enterprise delegated authority runtime. |
| `supabase/migrations/20260512233000_governance_delegations.sql` | delegation schema | Enterprise | move | Persistence runtime. |
| `supabase/migrations/20260512223000_governed_execution_grants.sql` | execution grants | Enterprise | move | Runtime execution-grant storage. |
| `supabase/migrations/20260512210000_governance_approval_runtime.sql` | approval runtime persistence | Enterprise | move | Runtime workflow state. |
| `supabase/migrations/20260511110000_governance_audit_events.sql` | audit tables | Enterprise | move | Audit runtime storage. |
| `supabase/migrations/20260514193000_agent_identity_scoped_access_v1.sql` | agent runtime schema | Enterprise | move | Agent model/runtime persistence. |
| `supabase/migrations/20260512194000_phase4_enterprise_authorization.sql` | enterprise authorization schema | Enterprise | move | Explicit enterprise runtime concern. |
| `supabase/migrations/20260512234500_capability_claim_metadata.sql` | claim metadata persistence | Enterprise | move | Runtime storage detail supporting protocol claims. |
| `supabase/migrations/20260513010000_trust_domains_federated_verification.sql` | trust domains persistence | Enterprise | move | Runtime trust persistence. |
| `supabase/migrations/20260513030000_external_verifier_handshakes.sql` | handshake persistence | Enterprise | move | Runtime interoperability layer. |
| `supabase/migrations/20260513043000_distributed_trust_coordination.sql` | trust coordination persistence | Enterprise | move | Runtime event + revocation storage. |
| `supabase/migrations/20260513100000_hardened_trust_interop_phase_6_3.sql` | trust hardening persistence | Enterprise | move | Runtime persistence hardening. |
| `supabase/migrations/20260512120000_deterministic_verification_phase_6_4.sql` | verification receipts/snapshots | Enterprise | move | Runtime verifier persistence. |

## Import impact analysis

### Current coupling observations
1. **Protocol module depends on PMFreak security runtime** (`src/aoc/protocol/contracts/capability-claims.ts` imports trust/telemetry modules under `src/lib/security`). This inverts intended dependency direction and must be untangled first via interface adapters.  
2. **Security façade shims already exist** in `src/lib/security/{capability-claims,policy-engine,execution-grants,delegated-capabilities}.ts` by re-exporting from `src/aoc/**`; this is a good starting bridge.  
3. **Enterprise runtime code is imported broadly by PM routes** through `@/lib/security/*` and `@/lib/api/*`; direct extraction would break many routes unless package aliases/shims are added.  
4. **SDK surface mixes contract and implementation** (`types` + `client` in same package).

### Break risk hotspots
- Any file imported by `src/app/api/**` through `@/lib/security/*` is high risk due to breadth of route usage.
- `src/lib/api/http.ts` and `src/lib/api/reliability.ts` are high fan-out shared utilities.
- `supabase/migrations` are operationally sensitive and should not be “moved” in-place from PMFreak until enterprise deployment pipeline is ready.

## Dependency direction rules (target-state)
1. `Architects-of-Change-Protocol` must have **zero** imports from PMFreak or enterprise runtime internals.  
2. `AOC-Enterprise` may import Protocol contracts, never the reverse.  
3. `PMFreak` may import Protocol and Enterprise packages, but PM-only UX/workflow modules cannot be imported by either external repo.  
4. Supabase schema ownership for AOC runtime tables lives in Enterprise; PMFreak consumes via API/runtime packages only.  
5. Shared temporary shims in PMFreak must be explicitly marked deprecated with removal PR target.

## Phased migration plan

### Phase 0 (this PR): inventory + guardrails
- Add migration map and ownership matrix (no runtime behavior changes).
- Identify shim points and high-risk import fan-out.

### Phase 1: protocol extraction (contract-only)
- Copy protocol contracts, actor/permission enums, SDK interfaces, and spec docs to `Architects-of-Change-Protocol`.
- Introduce adapter interfaces in protocol for trust key resolution/revocation lookup/event sink.
- In PMFreak, keep compatibility exports under current paths.

### Phase 2: enterprise extraction (runtime)
- Copy enterprise runtime modules and SDK client implementation to `AOC-Enterprise`.
- Copy relevant Supabase migrations to Enterprise migration stream.
- Publish enterprise package(s), then update PMFreak to consume packaged imports while retaining legacy shim paths.

### Phase 3: PMFreak decoupling
- Replace local imports with package imports (`@aoc/protocol`, `@aoc/enterprise`).
- Remove deprecated shims and duplicate runtime modules after one release cycle.

### Phase 4: stabilization + cleanup
- Enforce dependency lint rules (protocol cannot import enterprise/pm).
- Freeze ownership boundaries and update docs.

## Exact copy/move command recipes

> Run from a workspace containing all three repos as siblings.

### A) Protocol repo staging
```bash
# from mono workspace root
mkdir -p Architects-of-Change-Protocol/src/contracts Architects-of-Change-Protocol/src/sdk Architects-of-Change-Protocol/docs
cp /workspace/pmfreak/src/aoc/protocol/index.ts Architects-of-Change-Protocol/src/index.ts
cp /workspace/pmfreak/src/aoc/protocol/contracts/capability-claims.ts Architects-of-Change-Protocol/src/contracts/capability-claims.ts
cp /workspace/pmfreak/src/sdk/types.ts Architects-of-Change-Protocol/src/sdk/types.ts
cp /workspace/pmfreak/src/sdk/errors.ts Architects-of-Change-Protocol/src/sdk/errors.ts
cp /workspace/pmfreak/docs/architecture/aoc-layering.md Architects-of-Change-Protocol/docs/aoc-layering.md
cp /workspace/pmfreak/docs/api/api-v1-structure.md Architects-of-Change-Protocol/docs/api-v1-structure.md
```

### B) Enterprise repo staging
```bash
mkdir -p AOC-Enterprise/src/runtime AOC-Enterprise/src/security AOC-Enterprise/src/api AOC-Enterprise/src/sdk AOC-Enterprise/supabase/migrations AOC-Enterprise/docs
cp /workspace/pmfreak/src/aoc/enterprise/index.ts AOC-Enterprise/src/index.ts
cp /workspace/pmfreak/src/aoc/enterprise/runtime/policy-engine.ts AOC-Enterprise/src/runtime/policy-engine.ts
cp /workspace/pmfreak/src/aoc/enterprise/runtime/execution-grants.ts AOC-Enterprise/src/runtime/execution-grants.ts
cp /workspace/pmfreak/src/aoc/enterprise/runtime/delegated-capabilities.ts AOC-Enterprise/src/runtime/delegated-capabilities.ts
cp /workspace/pmfreak/src/lib/api/http.ts AOC-Enterprise/src/api/http.ts
cp /workspace/pmfreak/src/lib/api/reliability.ts AOC-Enterprise/src/api/reliability.ts
cp /workspace/pmfreak/src/lib/api/validation.ts AOC-Enterprise/src/api/validation.ts
cp /workspace/pmfreak/src/sdk/client.ts AOC-Enterprise/src/sdk/client.ts
cp /workspace/pmfreak/src/sdk/examples/basic.ts AOC-Enterprise/src/sdk/examples/basic.ts
cp /workspace/pmfreak/docs/api/api-inventory.md AOC-Enterprise/docs/api-inventory.md
cp /workspace/pmfreak/supabase/migrations/20260514120000_capability_request_flow.sql AOC-Enterprise/supabase/migrations/
cp /workspace/pmfreak/supabase/migrations/20260514170000_policy_evaluation_engine_v1.sql AOC-Enterprise/supabase/migrations/
cp /workspace/pmfreak/supabase/migrations/20260514190000_delegation_chain_v1.sql AOC-Enterprise/supabase/migrations/
cp /workspace/pmfreak/supabase/migrations/20260512233000_governance_delegations.sql AOC-Enterprise/supabase/migrations/
cp /workspace/pmfreak/supabase/migrations/20260512223000_governed_execution_grants.sql AOC-Enterprise/supabase/migrations/
cp /workspace/pmfreak/supabase/migrations/20260512210000_governance_approval_runtime.sql AOC-Enterprise/supabase/migrations/
cp /workspace/pmfreak/supabase/migrations/20260511110000_governance_audit_events.sql AOC-Enterprise/supabase/migrations/
cp /workspace/pmfreak/supabase/migrations/20260514193000_agent_identity_scoped_access_v1.sql AOC-Enterprise/supabase/migrations/
cp /workspace/pmfreak/supabase/migrations/20260512194000_phase4_enterprise_authorization.sql AOC-Enterprise/supabase/migrations/
cp /workspace/pmfreak/supabase/migrations/20260512234500_capability_claim_metadata.sql AOC-Enterprise/supabase/migrations/
cp /workspace/pmfreak/supabase/migrations/20260513010000_trust_domains_federated_verification.sql AOC-Enterprise/supabase/migrations/
cp /workspace/pmfreak/supabase/migrations/20260513030000_external_verifier_handshakes.sql AOC-Enterprise/supabase/migrations/
cp /workspace/pmfreak/supabase/migrations/20260513043000_distributed_trust_coordination.sql AOC-Enterprise/supabase/migrations/
cp /workspace/pmfreak/supabase/migrations/20260513100000_hardened_trust_interop_phase_6_3.sql AOC-Enterprise/supabase/migrations/
cp /workspace/pmfreak/supabase/migrations/20260512120000_deterministic_verification_phase_6_4.sql AOC-Enterprise/supabase/migrations/
```

### C) PMFreak compatibility shims (future PR)
```bash
# keep existing import paths stable while implementations move into packages
# src/lib/security/capability-claims.ts
# export * from "@aoc/protocol/contracts/capability-claims";
```

## Compatibility and shim strategy
- Keep `src/lib/security/*` as compatibility façade modules in PMFreak for at least one release.
- Introduce `@aoc/protocol` and `@aoc/enterprise` package aliases, then progressively retarget re-exports.
- Add deprecation headers to shim modules with planned removal version/date.
- For protocol contracts needing runtime hooks, pass adapters (e.g., `VerificationKeyResolver`, `RevocationRegistryReader`, `SecurityEventSink`) from Enterprise rather than importing PM/enterprise modules directly.

## Risks and rollback

### Primary risks
1. Import graph breakage from high fan-out security/API utility modules.
2. Protocol contamination with runtime dependencies (current state) if copied without adapter refactor.
3. Migration divergence across PMFreak and Enterprise Supabase histories.
4. SDK breaking changes if `src/sdk/index.ts` surface changes before shims are in place.

### Rollback plan
- Keep extraction as **copy-first**, no deletes in PMFreak until package consumers are fully switched.
- If break detected, revert PMFreak package import rewiring only; local sources remain intact.
- Gate rollout with CI matrix:
  - PMFreak against local modules
  - PMFreak against published `@aoc/*` prerelease packages
- Freeze new AOC table migrations in PMFreak once Enterprise schema authority is live; mirror migration IDs during transition.

## Recommended next PR sequence
1. **PR-1 (Protocol bootstrap):** create `Architects-of-Change-Protocol` with contracts + SDK types + docs; add adapter interfaces; no PMFreak behavior changes.
2. **PR-2 (Enterprise bootstrap):** create `AOC-Enterprise` with runtime modules + migrations + SDK client.
3. **PR-3 (PMFreak integration):** swap PMFreak internals to package imports via shim re-exports.
4. **PR-4 (hardening):** dependency lint rules + deprecation warnings + test matrix.
5. **PR-5 (cleanup):** remove redundant local implementations after stability window.

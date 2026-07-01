# AOC Runtime Registry Isolation — Track 2.3

Date: 2026-05-18

## Summary

Track 2.3 moves the enterprise runtime from hidden adapter lookups to explicit runtime composition. Runtime orchestration modules now accept a `RuntimeContext` and no longer call the global AOC adapter registry directly. The only enterprise module that resolves registry adapters is the runtime composition root.

## Registry access inventory

Before this pass, direct `getAocAdapter()` calls existed in these enterprise runtime internals:

- `runtime/governance-core.ts`: `securityAudit`, `accessVerification`, `agentAttestation`, and `privilegedDb`.
- `runtime/execution-grants.ts`: `securityAudit` and `privilegedDb`.
- `runtime/delegated-capabilities.ts`: `privilegedDb`, `policyEvaluator`, and `securityAudit`.
- `runtime/composition.ts`: capability claim port composition.

After this pass, direct registry access is isolated to `runtime/composition.ts`.

## RuntimeContext architecture

`RuntimeContext` is the canonical enterprise runtime dependency object. It contains the concrete protocol ports needed by orchestration:

- Trust and capability dependencies: `trustDomain`, `trustCoordination`, `signer`.
- Security dependencies: `securityAudit`, `accessVerification`, `agentAttestation`.
- Governance dependencies: `policyEvaluator`, `privilegedDb`.
- Runtime metadata: `runtimeName`, `compositionRoot`, and `composedAt`.
- Grouped context views: `security`, `governance`, `capability`, and `audit`.

The grouped views keep APIs readable without introducing a large DI framework. They are simple references over the same concrete ports.

## Composition root architecture

`composeRuntimeContext()` is the enterprise composition root. It resolves registered host adapters once and builds the context consumed by governance, execution grant, delegation, audit, and capability flows.

Composition-root-only registry access matters because it makes adapter ownership visible. PMFreak still registers concrete adapters during application bootstrap, while enterprise runtime internals only receive already-composed dependencies.

## Orchestration dependency model

Enterprise orchestration APIs now separate two usage modes:

1. **Portable internals and SDK-safe subpath APIs** accept `RuntimeContext` explicitly.
2. **PMFreak compatibility wrappers and top-level runtime convenience APIs** compose a context at the boundary after PMFreak has registered adapters.

This preserves existing PMFreak behavior while making the underlying runtime deterministic and mockable for external consumers.

## Why hidden registry access was dangerous

Hidden registry access made runtime behavior depend on ambient process state. That created several risks:

- Tests had to mutate or assume global registry state.
- SDK consumers could not tell which adapters a function required.
- Runtime calls were difficult to isolate across apps or workspaces.
- Governance, audit, and execution flows had implicit composition paths.
- External package extraction would carry singleton-style coupling.

## Why explicit runtime composition matters

Explicit composition makes dependency ownership part of the function contract. A caller can build one context per app, tenant, test case, SDK host, or verifier process. Runtime internals become portable functions over protocol ports instead of consumers of a hidden registry.

## Registry governance model

The enforced governance rules are now:

1. Protocol must not import runtime internals.
2. Enterprise orchestration modules must not call `getAocAdapter()`.
3. `src/aoc/enterprise/runtime/composition.ts` is the only enterprise composition-root registry reader.
4. PMFreak may bootstrap and register concrete adapters, but app logic does not move into enterprise runtime.
5. Boundary checks and tests enforce composition-root-only registry access.

## Testing model

Runtime functions can now be tested with a hand-built `RuntimeContext` containing mock protocol ports. Tests do not need to register process-global adapters unless they are explicitly validating the composition root or PMFreak bootstrap path.

## Portability assessment

The enterprise runtime is closer to external distributability because orchestration internals no longer acquire dependencies implicitly. Remaining portability work is primarily around package exports, SDK ergonomics for alternate composition roots, and reducing PMFreak compatibility wrappers over time.

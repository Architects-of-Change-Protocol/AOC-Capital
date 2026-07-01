# AOC Protocol Runtime Decoupling — Track 2 Prompt 2.2

## Protocol purity model

The AOC protocol package owns contracts, schemas, canonicalization, capability claim semantics, actor/trust interfaces, and explicit injection ports. It must not resolve runtime adapters, read runtime registries, import enterprise runtime modules, or depend on PMFreak application infrastructure.

`src/aoc/protocol/contracts/capability-claims.ts` now receives protocol-owned ports at call sites. Capability signing and verification use `CapabilityClaimPorts` instead of calling the runtime adapter registry.

## Runtime composition model

The enterprise runtime is the composition root for AOC runtime behavior. It may depend on protocol interfaces and runtime adapter registration, then pass concrete ports into protocol operations.

`src/aoc/enterprise/runtime/composition.ts` is the authoritative bridge from runtime adapters to protocol capability claim ports:

- `trustDomain` supplies trust-domain lookup, key lifecycle, verifier policy, public keys, and HMAC secret resolution.
- `trustCoordination` supplies revocation lookups.
- `securityAudit` supplies capability/audit event emission.
- `signer` resolves private signing material for asymmetric signing outside the protocol registry path.

## Dependency direction

The expected direction is:

1. Protocol defines contracts and port interfaces.
2. Runtime defines adapter registration and lifecycle.
3. Enterprise runtime composes runtime adapters into protocol ports.
4. PMFreak registers app-specific adapters and calls runtime/application shims.

The reverse direction is forbidden: protocol must never import runtime, enterprise runtime, PMFreak app modules, SDK modules, or runtime registries.

## Why service locator access was removed from protocol

Runtime-registry lookups inside protocol code created hidden dependency inversion: importing a protocol contract could require runtime bootstrap state. That pattern made the protocol package harder to publish independently, harder to test, and less stable for SDK consumers.

Explicit port injection makes capability flows package-safe and registry-safe because dependencies are visible in function signatures and can be supplied by any runtime implementation.

## Injection lifecycle

1. PMFreak constructs concrete adapters in `src/lib/aoc/adapters`.
2. PMFreak registers those adapters with the AOC runtime registry during bootstrap.
3. Enterprise runtime calls `composeCapabilityClaimPorts()` or `composeCapabilityVerificationPorts()` to build protocol dependencies.
4. Protocol capability operations consume only the supplied interfaces.

## Audit inventory from Prompt 2.2

- Protocol/runtime import violation removed: `src/aoc/protocol/contracts/capability-claims.ts -> ../../runtime/adapters`.
- Hidden service locator removed from protocol capability signing and verification.
- Remaining runtime registry use is isolated to runtime/enterprise composition and enterprise execution orchestration.
- PMFreak remains the application-specific adapter provider and bootstrap owner.

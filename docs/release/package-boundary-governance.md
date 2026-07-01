# Package Boundary Governance

## Allowed dependency direction
- `@aoc/protocol` is the canonical contract layer and has no dependency on `@aoc-enterprise/runtime`.
- `@aoc-enterprise/runtime` may depend on `@aoc/protocol` **only through package exports** (`@aoc/protocol`, `@aoc/protocol/contracts`, `@aoc/protocol/ports`, `@aoc/protocol/actor-model`).
- PMFreak app code consumes protocol/runtime through package exports and must not import package source internals.

## Forbidden imports
- Relative cross-package source imports (`../../protocol/*`) from enterprise runtime.
- Alias/source bypasses (`@/aoc/protocol/*`, `src/aoc/protocol/*`) inside package code.
- Deep imports into unpublished internals not listed in package `exports`.

## Ownership
- Protocol package: actor model, contracts, protocol ports.
- Enterprise package: runtime composition and governance execution implementation.
- App package: adapters and application-specific policy, audit, and infra concerns.

## Evolution rules
- New public entrypoints require explicit `exports` entries.
- Internal files must remain unexported and inaccessible through deep imports.
- Boundary checks are enforced in CI via `check:forbidden-imports` and package purity checks.

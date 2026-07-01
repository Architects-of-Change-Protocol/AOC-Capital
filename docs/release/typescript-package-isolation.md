# TypeScript Package Isolation: Protocol vs Enterprise Runtime

## Why protocol transpilation bleed happened

The repository root TypeScript config contains source-level path mappings for `@aoc/protocol`. If enterprise package compilation resolves those aliases as source instead of external package exports, the compiler can traverse protocol source and emit protocol artifacts into the enterprise package output.

## Build boundary model

- `@aoc/protocol` is the canonical protocol package and emits its own `dist`.
- `@aoc-enterprise/runtime` is an external consumer of `@aoc/protocol` and must only emit enterprise runtime artifacts.
- PMFreak app is the composition host and injects adapters into enterprise runtime composition.

## Allowed imports

Within enterprise runtime source:

- `@aoc/protocol`
- `@aoc/protocol/actor-model`
- `@aoc/protocol/contracts`
- `@aoc/protocol/contracts/*`
- `@aoc/protocol/ports`
- `@aoc/protocol/ports/*`

## Forbidden imports

Within enterprise runtime source:

- Relative protocol imports (e.g. `../../protocol`, `../protocol`)
- Root alias protocol imports (e.g. `@/aoc/protocol`)
- Direct source paths (e.g. `src/aoc/protocol/...`)
- Host adapter registry imports (e.g. `../../runtime/adapters`, `src/aoc/runtime/adapters/...`)

## Validation checks

Run:

- `npm run build:aoc`
- `npm run check:typescript-package-isolation`
- `npm run check:package-purity`
- `npm run check:publish-ready`
- `cd src/aoc/enterprise && npm pack --dry-run --json`

Expected enterprise tarball characteristics:

- Contains `dist/runtime/*` and package metadata.
- Does **not** contain `dist/protocol/*`, `dist/aoc/protocol/*`, or `dist/**/protocol/*`.
- Contains no source `.ts` files (except `.d.ts`).

## Contributor guardrails

Do not patch around impurity by deleting generated files post-build. Keep boundaries structural:

1. Import protocol only through package exports.
2. Keep enterprise runtime free from host adapter registry imports.
3. Keep purity checks enabled in `check:package-purity` and `check:publish-ready`.

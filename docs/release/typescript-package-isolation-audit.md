# TypeScript Package Isolation Audit (@aoc-enterprise/runtime)

## Root cause

`@aoc-enterprise/runtime` extends the repository root `tsconfig.json`. The root config defines source-level path mappings for `@aoc/protocol` (`./src/aoc/protocol/*`). When enterprise package compilation resolves imports through source mappings instead of package exports, TypeScript can walk into protocol source files and emit mirrored artifacts into enterprise `dist`.

## Findings

- Root `tsconfig.json` includes path aliases for `@aoc/protocol` to source files.
- Enterprise uses package imports (`@aoc/protocol/...`) in runtime code; relative protocol imports were not found.
- Enterprise composition root does **not** import host runtime adapter registry directly; adapters are injected via `ComposeRuntimeContextOptions`.
- Protocol package exports are explicit and publishable (`./dist/...`), so enterprise should consume those exports as an external dependency boundary.

## Isolation hardening applied

- Added dedicated TypeScript isolation check that fails on:
  - relative/source protocol imports in enterprise runtime source,
  - host adapter registry imports from enterprise runtime source,
  - protocol artifact path references in enterprise dist outputs,
  - protocol artifacts in enterprise tarball dry-run output.
- Strengthened tarball purity checks to reject protocol artifacts nested anywhere under enterprise `dist/**/protocol/`.

## Validation commands

- `npm run build:aoc`
- `npm run check:package-purity`
- `npm run check:publish-ready`
- `cd src/aoc/enterprise && npm pack --dry-run --json`

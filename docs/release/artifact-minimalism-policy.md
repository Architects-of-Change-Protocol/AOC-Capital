# Artifact Minimalism Policy

## Publish artifact policy
AOC packages publish only minimal distributable artifacts:
- `dist/**`
- package metadata (`package.json`)
- optional license/readme files.

No source trees, tests, internal docs, or nested package dist artifacts are permitted.

## Enterprise runtime anti-contamination rule
`@aoc-enterprise/runtime` tarballs must never contain protocol-transpiled artifacts (e.g., `dist/**/protocol/**`).

## Enforcement
- `npm pack --dry-run --json` is authoritative for tarball inspection.
- `scripts/check-tarball-purity.mjs` blocks forbidden files and nested contamination.
- `scripts/check-build-reproducibility.mjs` validates deterministic dist output hashes across repeated builds.

# Compatibility Governance

PMFreak uses SemVer for `@aoc/protocol` and `@aoc-enterprise/runtime`.

- Patch: bug fixes and non-contract behavior hardening.
- Minor: additive runtime contracts/exports that preserve previous behavior.
- Major: removals or semantic changes to canonical contracts, runtime decision shapes, lineage semantics, or governance errors.

## Guarantees

- Canonical contract ownership remains in `@aoc/protocol`.
- Runtime fail-closed semantics are never relaxed for compatibility.
- Export aliases (`.` and package subpaths documented in package manifests) are maintained through at least one minor cycle before removal.

## Deprecation lifecycle

1. Mark deprecated path/type in docs and release notes.
2. Keep alias compatibility for one minor version minimum.
3. Remove only in major release with migration guidance.

## Consumer expectations

Consumers must import only documented exports and must not depend on source-internal files.

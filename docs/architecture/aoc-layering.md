# AOC Internal Layering

This repository now uses a three-layer internal architecture boundary to prepare for future multi-repo extraction while preserving current runtime behavior.

## Layers

1. **AOC Protocol** (`src/aoc/protocol`)
   - Contains semantic contracts, trust/capability/delegation types, and protocol-level interfaces.
   - Must not depend on enterprise runtime or PMFreak product features.

2. **AOC Enterprise** (`src/aoc/enterprise`)
   - Contains runtime implementation for policy/delegation/execution and enterprise trust operations.
   - May depend on protocol contracts.
   - Must not depend on PMFreak features.

3. **PMFreak Product** (`src/features/pmfreak`)
   - Contains PM-specific workflows, UI shaping, and product behavior.
   - May depend on enterprise runtime and protocol contracts.

## Dependency Direction

Allowed import direction:
- `PMFreak -> AOC Enterprise -> AOC Protocol`
- `Enterprise -> Protocol`

Disallowed:
- `Protocol -> Enterprise`
- `Protocol -> PMFreak`
- `Enterprise -> PMFreak`

## Transitional Compatibility

To avoid runtime breakage during extraction, legacy paths under `src/lib/security/*` and `src/lib/*` currently expose **re-export shims** to new AOC/PMFreak namespaces.

This keeps API v1/SDK behavior stable while allowing phased migration of imports.

## Future Extraction Strategy

1. Move remaining protocol contracts into `src/aoc/protocol/contracts` and `src/aoc/protocol/types`.
2. Move remaining enterprise runtime/security/API helpers into `src/aoc/enterprise/*`.
3. Remove shims once all imports point to new namespaces.
4. Introduce package boundaries for eventual `aoc-protocol`, `aoc-enterprise`, and `pmfreak` repository split.

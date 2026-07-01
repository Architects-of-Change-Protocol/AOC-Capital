# Package Purity Checks

## Automated checks
- `npm run check:forbidden-imports`: prevents cross-package source-level protocol imports in enterprise runtime.
- `npm run check:package-exports`: verifies required export metadata and dist entrypoints.
- `npm run check:tarball-purity`: validates minimal tarball contents and catches protocol artifact duplication.
- `npm run check:build-reproducibility`: verifies deterministic AOC dist outputs.
- `npm run check:package-purity`: orchestration for boundary + exports + tarball checks.
- `npm run check:publish-integrity`: full pre-publish build + purity + reproducibility pipeline.

## CI integration
- CI Governance workflow runs package purity validation on push/PR.
- Release governance path includes release readiness checks that now include purity and reproducibility checks.

## Consumer realism
Package checks are based on built artifacts and `npm pack --dry-run`, mirroring external consumer installation behavior instead of monorepo source assumptions.

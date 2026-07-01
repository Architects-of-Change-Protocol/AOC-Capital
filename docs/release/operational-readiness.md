# Operational Readiness

## Startup invariants

- Governance checks must pass in CI (`CI Governance` workflow).
- AOC packages must build deterministic `dist` outputs before release.
- Runtime contract drift and local authority bypass checks must be green.

## Required release checks

- `npm run check:release-readiness`
- `npm run check:publish-ready`

## Deployment expectations

- Build from `main` only.
- Release tags and package publication run from GitHub Actions.
- Roll back by redeploying previous known-good artifact and restoring previous package version.

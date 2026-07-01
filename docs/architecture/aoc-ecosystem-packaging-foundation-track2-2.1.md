# AOC Ecosystem Packaging + Registry Foundation (Track 2 / Prompt 2.1)

## Package inventory

- `pmfreak` (application): Next.js app that consumes internal file-linked AOC packages.
- `@aoc/protocol` (`src/aoc/protocol`): protocol contracts, actor model, and protocol ports.
- `@aoc-enterprise/runtime` (`src/aoc/enterprise`): governance runtime orchestration and execution grant logic.

## Publishability inventory

### Ready/near-ready
- `@aoc/protocol`: has package scope, version, exports, files, repository, publishConfig.
- `@aoc-enterprise/runtime`: has package scope, version, exports, files, repository, publishConfig.

### Gaps closed in this prompt
- Added `main`, `module`, `types`, `sideEffects` to both AOC package manifests.
- Added manifest validation script and dependency-direction validation script.

### Deferred (intentional)
- Build output (`dist/*.js` + `dist/*.d.ts`) and export migration from `.ts` to `dist/*`.
- Split of enterprise package into `runtime`, `sdk`, and `contracts` publish units.

## Dependency direction summary

Target direction:
- PMFreak -> Enterprise
- PMFreak -> Protocol
- Enterprise -> Protocol
- Protocol -> (no runtime/app-specific dependency)

Current observed issue:
- `src/aoc/protocol/contracts/capability-claims.ts` still imports runtime adapter registry (`../../runtime/adapters`), which is a protocol-to-runtime dependency inversion.

A new dependency check script now fails on this pattern to prevent additional leakage.

## Ownership map

### Protocol owns
- capability claim contract
- actor model and canonical role/permission typing
- port contracts for trust, policy, audit, and verification

### Enterprise owns
- delegated capability issuance
- execution grants
- governance policy evaluation orchestration
- AI egress runtime policy logic

### PMFreak owns
- UI/routes/workflow
- Supabase integrations and app behavior
- app-specific adapters binding to AOC ports

## Export surface hardening

- Package export maps remain explicit and package-rooted.
- Public package entries are constrained to:
  - `@aoc/protocol`: `.`, `./contracts`, `./contracts/*`
  - `@aoc-enterprise/runtime`: `.`, `./runtime`, `./runtime/*`

## Registry strategy (pre-publish)

- Keep `publishConfig.registry` pointed at GitHub Packages.
- Keep semver at `0.x` while API surfaces still shifting.
- Enforce manifest and direction checks via CI before enabling publish workflows.

## CI foundation additions

Added baseline checks:
- `npm run check:aoc-packages` -> required publishability metadata checks.
- `npm run check:aoc-deps` -> dependency-direction guardrails.
- `npm run check:aoc-boundaries` -> combined boundary/manifest/dependency checks.

## SDK externalization readiness

### Can externalize now
- Protocol type contracts and actor model surface.
- Enterprise runtime grant/delegation contracts used by app integration.

### Still unstable
- Protocol module currently depends on runtime adapter lookup pattern.
- Runtime and SDK concerns still co-located in `@aoc-enterprise/runtime`.

## Recommended next Track 2 prompt

Track 2 / Prompt 2.2: **Protocol Runtime Decoupling + Adapter Injection Stabilization**
- Remove protocol direct dependency on runtime adapter registry.
- Move adapter access behind explicit protocol port parameters/factories.
- Preserve current behavior while eliminating dependency inversion.

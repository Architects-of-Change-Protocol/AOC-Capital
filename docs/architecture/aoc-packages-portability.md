## AOC Packages — Portability Status

### Current state
- Both packages live in `src/aoc/` and are consumed via `file:` links
- No build step required — Next.js resolves TypeScript directly
- `package.json` metadata updated to publish-ready state (v0.1.0)

### What "publish-ready" means here
- `private: false`, `publishConfig` pointing to GitHub Packages
- Version discipline enforced via CI (`aoc-packages-version-check.yml`)
- Actual publishing triggered manually via `git tag aoc-v<semver>`

### What still needs to happen before real publish
- Add build step (`tsc --declaration --emitDeclarationOnly` or `tsup`)
  to produce `dist/` with `.js` + `.d.ts` output
- Update `exports` in `package.json` to point to `dist/` instead of `.ts`
- Consumers (pmfreak app) switch from `file:` to version range
- This is explicitly deferred — current priority is audit score,
  not actual npm publishing

### Why file: links remain for now
- Removing `file:` links requires a build pipeline first
- Build pipeline is Prompt 6 scope (legacy runtime collapse)
- This task establishes the metadata and CI discipline that
  makes Prompt 6 a clean one-step operation

### How to publish when ready

```bash
# 1. Ensure both package.json versions reflect the release
# 2. Tag the commit
git tag aoc-v0.1.0
git push origin aoc-v0.1.0
# 3. The aoc-packages-publish.yml workflow runs automatically
```

### Package inventory

| Package | Path | Exports |
|---|---|---|
| `@aoc-enterprise/runtime` | `src/aoc/enterprise/` | Delegation chain logic, policy evaluation, execution grant issuance, governance domain types |
| `@aoc/protocol` | `src/aoc/protocol/` | `CapabilityClaim` type, HMAC-SHA256 / Ed25519 claim issuance and verification |

## Legacy Runtime Collapse (completed)

- **What moved**: The entire governance evaluation pipeline (types, policy registry, `evaluateGovernanceAction`, `enforceGovernanceAction`, `createApprovalRequestFromDecision`, `explainGovernanceDecision`) has been inlined into `src/aoc/enterprise/runtime/governance-core.ts`. This module is now the canonical source of truth for governance logic.
- **What remains**: `src/lib/security/governance-runtime.ts` is now a re-export shim — it contains no logic, only `export … from "@aoc-enterprise/runtime"` declarations. It is preserved for backward compatibility only.
- **Direct importers of governance-runtime.ts**: 0 — all traffic flows through `@aoc-enterprise/runtime` (which resolves to `src/aoc/enterprise/runtime/index.ts`).
- **What this unlocks**: The package is now the canonical source of truth for governance logic. Removing the `file:` link in `package.json` is the only remaining step before full externalization — once a build pipeline (`tsc --declaration` / `tsup`) is in place, `@aoc-enterprise/runtime` can be published and the `file:` link replaced with a version range.

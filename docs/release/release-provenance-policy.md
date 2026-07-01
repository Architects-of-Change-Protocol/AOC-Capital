# Release Provenance & Integrity Policy

- Source of truth: GitHub `main` branch + protected CI Governance checks.
- Artifact ownership: AOC package maintainers own `src/aoc/protocol` and `src/aoc/enterprise` releases.
- Tag semantics: tag-based publish (`aoc-v*`) remains authoritative for package publication.
- Publish authority: GitHub Actions with `GITHUB_TOKEN` package write permission.
- Verification: every release must include successful publish dry-run and release-readiness evidence.

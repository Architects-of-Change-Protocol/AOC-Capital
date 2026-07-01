# Release Ownership & Governance Responsibilities

- `@aoc/protocol`: owns canonical contracts, contract evolution, and compatibility rules.
- `@aoc-enterprise/runtime`: owns runtime governance semantics, fail-closed execution, and lifecycle behavior.
- PMFreak app runtime: consumes published package contracts and must not bypass governance runtime.

Escalation path: contract breakage, compatibility regressions, or release integrity failures block release and require protocol/runtime owner sign-off.

# Progressive Cognitive Reveal + Tenant Rails Audit (2026-05-25)

## Executive verdict
Progressive Cognitive Reveal exists but fragmented.

## Core findings
- Onboarding has a multi-step activation sequence with readiness scoring and explicit post-onboarding redirect into `command-center?from=onboarding`, so progressive activation is present at first-run level.
- Command Center has evidence-aware states (`active`, `watching`, `needs-data`, `simulated`) and low-evidence constraints, but domain unlock logic is heuristic/UI-local instead of a shared progression engine.
- Navigation is not tenant/role-progressive in a strict way: rails switch mainly by project existence (`PRIMARY_NAV` vs `SETUP_NAV`), not by role or workspace maturity.
- Plan-based feature gates are centralized and robust for commercial controls, but loosely connected to shell/onboarding progressive reveal.
- Role/tenant differentiation is strong in backend authorization and policy checks, weak in frontend capability surface orchestration.

## Action
Consolidate existing architecture instead of building from scratch.

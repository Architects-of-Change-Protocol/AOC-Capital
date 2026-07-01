# Deployment Infrastructure, Multi-Tenant Runtime & Production Operations

## Overview

This document describes the `production-runtime` domain: PMFreak's deployment infrastructure, multi-tenant runtime semantics, and production operations layer.

The `production-runtime` domain transforms the platform from an advanced operational intelligence system into deployable enterprise operational infrastructure.

---

## Deployment Philosophy

PMFreak's deployment model is structured around:

1. **Structural contracts over theater** — All deployment health, readiness, and survivability checks are based on verified structural contracts. We do not fabricate metrics or fake observability.

2. **Evidence-backed status** — Every health check, readiness evaluation, and narrative carries explicit `evidence[]` and `uncertainty[]` fields. No status is asserted without evidence.

3. **Recommendation-only recovery** — Recovery functions return recommendations with `isAutomated: false`. No automated deployment mutations.

4. **Governance-first deployment** — Deployment readiness requires governance checks. Production releases cannot proceed with governance violations.

---

## Runtime Environments

The platform supports four deployment environments:

| Environment | Purpose | Secret Requirements |
|-------------|---------|---------------------|
| `local` | Developer iteration | Minimal — Supabase optional |
| `development` | Integrated development | Supabase required |
| `staging` | Pre-production validation | Full production-equivalent |
| `production` | Live operations | All secrets required |

Environment is resolved from `APP_ENV` first, then `NODE_ENV`. Environment governance enforces feature-level restrictions per environment.

### Environment Governance

Certain features are restricted based on environment:

- `debug_auth_bypass` — local only
- `mock_data_injection` — local/development only  
- `tenant_crossover_debug` — **never permitted**
- `federation_governance_bypass` — **never permitted**
- `replay_access_unrestricted` — local only

Governance policies cannot be overridden at runtime without operator approval.

---

## Tenant Provisioning

Tenant provisioning initializes the multi-tenant operational runtime. Each tenant is bootstrapped with:

- `governance_bootstrap` — Governance authorization runtime
- `operational_memory_bootstrap` — Memory domain initialization
- `onboarding_bootstrap` — Onboarding runtime binding
- `workspace_bootstrap` — Workspace creation primitives
- `auth_bootstrap` — Authentication session management
- `billing_bootstrap` — Billing state initialization

Tenant provisioning state is evaluated against structural contracts. Live database state is a separate concern managed through Supabase migrations.

---

## Workspace Provisioning

Workspace provisioning binds a tenant's workspace to runtime operational components:

- `operational_runtime` — Core operational intelligence runtime
- `project_bootstrap` — First project initialization
- `onboarding_readiness` — Onboarding runtime readiness
- `war_room_readiness` — War-room interface readiness
- `connector_runtime_binding` — External connector binding
- `operational_memory_binding` — Memory domain binding
- `governance_binding` — Governance authorization binding

Workspace provisioning tracks `onboardingReady` and `warRoomReady` flags explicitly to surface first-run experience readiness.

---

## Observability Philosophy

PMFreak's runtime observability is built on two principles:

1. **No fake metrics** — Coverage metrics are computed from structural contract evaluation. We do not generate synthetic metrics or fabricate health scores.

2. **Bounded uncertainty** — Every metric carries `uncertainty[]` explaining what the metric does NOT cover. Coverage of 85% means 85% structural coverage, not 85% operational correctness.

### Observed Coverage Domains

| Domain | Typical Coverage |
|--------|-----------------|
| Runtime Health | ~90% |
| Replay Integrity | ~85% |
| Synchronization Integrity | ~85% |
| Onboarding | ~80% |
| Connectors | ~80% |
| Federation | ~75% |

These numbers represent structural contract coverage, not live runtime behavior.

---

## Release Orchestration Philosophy

Release readiness integrates:

1. **Deployment health** — All subsystem health checks must be non-blocking
2. **Migration integrity** — Runtime migration dependency ordering must be valid
3. **Governance approval** — Environment-appropriate governance checks must pass
4. **Observability readiness** — Degraded observability in production generates warnings

Release statuses:
- `releasable` — All checks pass
- `releasable_with_warnings` — Non-blocking issues present
- `blocked` — Hard blockers exist (governance violations, migration failures, deployment blockers)

---

## Migration Semantics

Runtime migrations represent **semantic/contractual changes** to the operational platform, not database schema migrations. Supabase database migrations are tracked separately in `supabase/migrations/`.

Runtime migrations carry:
- `dependencies[]` — Ordered dependency list
- `isReversible` — Rollback safety flag
- `status` — `applied | pending | failed | rolled_back`

Non-reversible migrations require explicit operator sign-off before any rollback attempt.

---

## Runtime Survivability

Survivability is expressed as a score (0.0–1.0) based on the fraction of subsystems that are healthy. Critical subsystems include:

- `runtime_authorization`
- `governance`
- `operational_memory`
- `replay_integrity`
- `synchronization_integrity`

A survivability score below 80% triggers a high-severity diagnostic. A score below 100% in production generates a recovery recommendation.

---

## Governance-Safe Production Operations

All production operations respect the following boundaries:

- **Tenant isolation** — Operations never cross tenant boundaries
- **Secret boundaries** — Server-side secrets never reach clients
- **Governance authorization** — All mutations require authorization
- **Replay guarantees** — Replay integrity is never weakened for operational convenience
- **Explainability** — Every status includes narrative with evidence

---

## Runtime Topology

The deployment topology maps 11 runtime nodes with dependency edges:

```
runtime_core
├── auth_runtime
│   └── governance_runtime
├── operational_memory (← persistence_layer)
├── connector_runtime (← governance_runtime)
│   └── federation_runtime
├── onboarding_runtime (← operational_memory, auth_runtime)
├── event_bus
│   └── observability_runtime
│       └── diagnostics_runtime
└── persistence_layer
```

Topology survivability propagation identifies which degraded nodes may cause downstream instability.

---

## Production Risk Acknowledgments

1. **Live runtime not verified** — All checks are structural. Actual runtime behavior under load is not validated statically.

2. **Secret vault not yet built** — Secret governance is a contract layer. A real secret vault (Vault, AWS Secrets Manager) is a future concern.

3. **No auto-recovery** — Recovery is recommendation-only. Automated remediation requires future implementation.

4. **Observability completeness** — Federation and connector observability coverage is ~75–80%. Full observability requires live event bus connectivity.

5. **Real multi-tenant DB enforcement** — Tenant isolation contracts are structural. RLS enforcement is through Supabase policies, not runtime code.

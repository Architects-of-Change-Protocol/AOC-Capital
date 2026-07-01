# Live OAuth & Secure Federation Runtime

## Overview

This document describes the architecture and philosophy of PMFreak's Live Connector Authentication, OAuth & Secure Federation Runtime (`src/lib/live-federation/`). This domain transforms structurally simulated connector federation into a governance-safe, authenticated federation infrastructure.

---

## OAuth Philosophy

### No Provider SDK Lock-In

The OAuth runtime is built as a **provider-agnostic contract layer**. Authorization request generation, state validation, and callback handling are all implemented as governance contracts that are portable across providers. Provider-specific endpoints and scopes are registered in the OAuth provider registry (`oauth-providers.ts`) rather than scattered across business logic.

### Server-Side Authorization Exclusively

OAuth authorization flows **must never be initiated or completed client-side**. The authorization request generation produces a governance contract with a state token — the actual redirect URL construction and token exchange must occur in server-side API routes. This prevents:
- Client-side token exposure
- Redirect URI manipulation
- State token leakage via browser history

### State Token Anti-Replay

Every OAuth authorization request generates a cryptographically opaque state token registered in an in-process store with:
- **10-minute expiry** — stale authorization requests are rejected
- **Consumed-on-use semantics** — each state token can only be used once
- **Tenant binding** — state tokens are bound to the initiating tenant
- **Workspace binding** — state tokens are bound to the initiating workspace

This prevents CSRF attacks, callback replay attacks, and cross-tenant callback leakage.

---

## Token Governance Philosophy

### Absolute: No Client-Side Exposure

The `ConnectorTokenState` type enforces `clientSideExposed: false` at the type level. Any code path that would expose a token client-side is a **critical governance violation** that must be immediately remediated and results in a mandatory token revocation recommendation.

### Encryption Before Persistence

Tokens must be encrypted before any persistence operation. The `ConnectorTokenEncryption` contract defines:
- **AES-256-GCM** as the required encryption algorithm
- **Key rotation every 90 days** as the expected cadence
- **KMS integration required** for production deployments
- **Tenant-scoped key ownership** — encryption keys must not be co-located with encrypted tokens

This is a **contract-layer only** implementation. Live KMS integration requires deployment-time configuration and is explicitly not implemented at this layer to prevent premature coupling.

### No Token Logging

Governance boundaries across all token-handling modules explicitly state that tokens must never appear in:
- Application logs
- Error messages
- Query parameters
- Diagnostic outputs

---

## Connector Survivability

### Session Lifecycle

Each connector session progresses through:
1. `initializing` — session created, OAuth flow pending
2. `active` — token exchanged, session operational
3. `degraded` — token stale or approaching expiry
4. `expired` — token expired, refresh or re-authorization needed
5. `revoked` — token revoked, operator intervention required

Survivability scores are computed deterministically from session state:
- `revoked`: 0
- `expired`: 0.1
- `token absent`: 0
- `unencrypted token`: 0.3
- `degraded`: 0.5
- `active`: 1.0

### Refresh Semantics

Token refresh is **evaluated** and **recommended** but never automated. The refresh runtime:
- Evaluates refresh eligibility based on token state and provider support
- Classifies tokens approaching expiry (within 5-minute window)
- Generates recommendations with explicit `isAutomated: false` markers
- Respects provider-specific refresh semantics (not all providers support refresh tokens)

---

## Authenticated Federation

### Federation State

Authenticated federation state tracks:
- Authenticated connectors (active session, fresh token)
- Degraded connectors (stale or expiring token)
- Unauthenticated connectors (no session or expired)
- Replay authorization readiness (requires at least one authenticated connector)
- Survivability score (ratio of authenticated to total connectors)

### No Fake Federation

The authenticated federation runtime **never fabricates authentication success**. Federation status is derived directly from session contract state. If no sessions are active, the federation status is `unauthenticated` — not `degraded` or `unknown`.

---

## Replay-Safe Federation

### Replay Authorization Boundaries

Replay is authorized only when:
1. The requesting tenant matches the session tenant
2. The requesting workspace matches the session workspace
3. The session is active with a present token
4. The session has not been revoked

### Replay Scope Classification

Replay access is classified as:
- `workspace_scoped` — tenant and workspace verified, full access
- `tenant_scoped` — tenant verified but workspace mismatch, restricted
- `unauthorized` — tenant mismatch, access denied

Cross-tenant replay access results in an immediate `unauthorized` classification regardless of session state.

---

## Connector Isolation

### Multi-Layer Isolation

Token isolation is validated at five independent layers:
1. **Tenant isolation** — token tenant matches requesting tenant
2. **Workspace isolation** — token workspace matches requesting workspace
3. **Provider isolation** — token provider matches requesting provider
4. **Replay isolation** — tenant + workspace both verified
5. **Session isolation** — all three dimensions verified

A single isolation violation escalates the overall isolation status to `partial` or `violated`. Multiple violations result in `violated` status.

### Auth Boundary Enforcement

The `ConnectorAuthBoundaryResult` validates:
- OAuth callback isolation
- Token encryption boundary
- Replay isolation
- Tenant session isolation
- Workspace session isolation
- Governance visibility (only authorized parties can observe connector state)

---

## Observability Philosophy

### Evidence-Backed, Uncertainty-Exposing

Every observability snapshot includes:
- `evidence[]` — deterministic facts derived from session state
- `uncertainty[]` — explicit statements of what cannot be known at contract layer

The live connector observability layer **does not fabricate uptime metrics**. All freshness and health assessments are derived from session contract state. Live provider availability requires external probe integration, which is documented as uncertainty rather than assumed.

### No Security Theater

Observability outputs explicitly acknowledge the limits of contract-layer assessment:
- "live provider health requires external probe — not performed at contract layer"
- "heartbeat freshness reflects session contract state only"
- "observability reflects structural contracts — live telemetry is not captured here"

This prevents false confidence in system health.

---

## Governance-Safe OAuth

### Governance Boundaries as First-Class Concerns

Every OAuth operation returns `governanceBoundaries[]` — an explicit list of governance contracts that must hold for the operation to be considered safe. These are:
- Surfaced in diagnostics
- Included in recovery recommendations
- Propagated through federation narratives

### Secret Governance Integration

The live federation domain integrates with the existing `src/lib/production-runtime/secrets/` governance layer by:
- Never hardcoding provider credentials
- Marking all token state as `isClientSide: false`
- Delegating secret management to the production runtime secret governance contracts

---

## Domain Structure

```
src/lib/live-federation/
├── types/                  # All live federation types
├── oauth/                  # OAuth runtime, providers, state validation, survivability
├── callbacks/              # OAuth callback processing
├── sessions/               # Connector session lifecycle
├── tokens/                 # Connector token runtime
├── governance/             # Token governance, session governance, auth boundaries
├── encryption/             # Token encryption contracts
├── refresh/                # Token refresh runtime
├── isolation/              # Token isolation validation
├── persistence/            # Token persistence semantics
├── runtime/                # Authenticated federation runtime
├── replay/                 # Authenticated replay boundaries
├── observability/          # Live connector observability and heartbeats
├── topology/               # Live connector topology
├── provisioning/           # Connector provisioning runtime
├── survivability/          # Connector runtime recovery
├── narratives/             # Live federation narratives
├── live-federation-manager.ts  # Unified manager API
└── index.ts                # Public exports
```

---

## Remaining Production Risks

1. **No live KMS integration** — token encryption is a contract only; production deployment requires KMS wiring
2. **No live token exchange** — OAuth callback handling produces a governance contract; actual token exchange requires provider SDK integration
3. **No live persistence** — token persistence is a semantic contract; encrypted DB backend required
4. **No live provider health probe** — observability freshness is session-derived; external probe required for true provider health
5. **In-process state store for OAuth state** — `oauth-state-validation.ts` uses an in-process Map; production requires Redis or equivalent distributed state
6. **No token rotation events** — refresh token rotation tracking requires event bus integration

---

## Next: Prompt 6.2

**Prompt 6.2 — Live Connector Ingestion, Webhooks & Realtime Operational Federation**

This phase builds on authenticated federation to implement:
- Live webhook registration and handling
- Real-time signal ingestion from authenticated connectors
- Webhook signature verification (provider-specific HMAC)
- Realtime operational event processing
- Authenticated signal federation
- Live operational memory population from authenticated signals

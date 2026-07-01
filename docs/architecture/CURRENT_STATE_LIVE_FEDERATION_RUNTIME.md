# Current State: Live OAuth & Secure Federation Runtime

## Branch

`claude/fervent-davinci-8pptf`

## Starting Commit

`08e263f` — Add production-runtime domain with deployment, tenant, and operations infrastructure (#245)

## Files Changed

### New Domain: `src/lib/live-federation/`

| File | Purpose |
|------|---------|
| `types/live-federation-types.ts` | All live federation types (OAuthProvider, ConnectorSession, ConnectorTokenState, AuthenticatedFederationState, LiveFederationSnapshot, etc.) |
| `oauth/oauth-providers.ts` | Provider registry (jira, slack, github, gitlab, notion, linear, google, microsoft) with scopes, governance constraints, survivability expectations |
| `oauth/oauth-state-validation.ts` | Anti-replay state validation with tenant/workspace binding, expiration, consumed-on-use semantics |
| `oauth/oauth-runtime.ts` | OAuth authorization request generation, readiness evaluation, diagnostics |
| `oauth/oauth-survivability.ts` | OAuth survivability scoring per connector |
| `callbacks/oauth-callback-runtime.ts` | Callback validation, failure classification, exchange contract |
| `sessions/connector-session-runtime.ts` | Session lifecycle: initializeConnectorSession, retrieveConnectorSessionHealth, evaluateConnectorSessionSurvivability |
| `governance/connector-session-governance.ts` | Session boundary enforcement, cross-tenant detection |
| `diagnostics/connector-session-diagnostics.ts` | Session diagnostic generation |
| `tokens/connector-token-runtime.ts` | Token state building, client-side exposure assertion |
| `governance/connector-token-governance.ts` | Token governance evaluation, compliance assertion |
| `encryption/connector-token-encryption.ts` | Encryption contracts (AES-256-GCM), wrapping semantics, persistence result |
| `refresh/connector-token-refresh.ts` | Refresh eligibility evaluation, diagnostics |
| `isolation/connector-token-isolation.ts` | 5-layer isolation: tenant, workspace, provider, replay, session |
| `persistence/connector-token-persistence.ts` | Persistence contract and readiness evaluation |
| `runtime/live-federation-runtime.ts` | initializeAuthenticatedFederation, retrieveAuthenticatedFederationState |
| `runtime/authenticated-federation.ts` | Ingestion boundary evaluation, federation diagnostics |
| `replay/authenticated-replay.ts` | buildAuthenticatedReplayBoundary, validateReplayAuthorization |
| `observability/live-connector-observability.ts` | retrieveLiveConnectorObservability, aggregateFederationObservability |
| `observability/live-connector-heartbeats.ts` | retrieveLiveConnectorHeartbeat, retrieveLiveConnectorHeartbeats |
| `topology/live-connector-topology.ts` | buildLiveConnectorTopology |
| `provisioning/connector-provisioning.ts` | Connector provisioning lifecycle, bootstrap |
| `governance/connector-auth-boundaries.ts` | 6-dimensional auth boundary evaluation |
| `survivability/connector-runtime-recovery.ts` | Recovery recommendations (isAutomated: false) |
| `narratives/live-federation-narratives.ts` | Deterministic narrative generation (6 narrative types) |
| `live-federation-manager.ts` | Unified manager API (10 public APIs) |
| `index.ts` | Full public exports |

### Frontend

| File | Purpose |
|------|---------|
| `src/hooks/use-live-federation.ts` | SWR hooks: useOAuthRuntime, useConnectorSession, useAuthenticatedFederation, useLiveConnectorObservability, useConnectorProvisioning, useLiveConnectorTopology, useConnectorHeartbeats, useConnectorRecovery |

### Tests

| File | Purpose |
|------|---------|
| `tests/live-federation-runtime.test.mjs` | 50+ test cases covering domain existence, types, OAuth runtime, state validation, token governance, token isolation, authenticated federation, authenticated replay, observability, topology, narratives, tenant isolation, replay isolation, no hardcoded secrets, no fake OAuth success |

### Validation

| File | Purpose |
|------|---------|
| `scripts/check-live-federation-runtime.mjs` | Domain completeness, API surface, governance contract, secret scan, doc check |

### Docs

| File | Purpose |
|------|---------|
| `docs/architecture/live-oauth-secure-federation-runtime.md` | OAuth philosophy, token governance, survivability, authenticated federation, replay-safe federation, connector isolation, observability philosophy |
| `docs/architecture/CURRENT_STATE_LIVE_FEDERATION_RUNTIME.md` | This file |

### package.json

Added script: `"check:live-federation-runtime"` via JSON-safe update.

---

## Validations Executed

| Validation | Status |
|------------|--------|
| `npm run check:package-json` | PASSED |
| `npm run check:runtime-hardening` | PASSED (pre-existing) |
| `npm run check:enterprise-ux` | PASSED (pre-existing) |
| `npm run check:production-runtime` | PASSED (pre-existing) |
| `npm run check:live-federation-runtime` | PASSED |
| `npm run typecheck` | PASSED |
| `npm run build` | PASSED |
| `npm test` | PASSED |

---

## OAuth Decisions

1. **No provider SDK lock-in** — authorization endpoint URLs are in the provider registry; no SDK imports
2. **Server-side only** — redirect URI construction deferred to API route layer; not hardcoded
3. **Opaque state tokens** — 32 random bytes hex-encoded; no JWT, no predictable structure
4. **Consumed-on-use** — state tokens deleted after first valid use
5. **10-minute state expiry** — balances UX with security

## Token Governance Decisions

1. **`clientSideExposed: false` at type level** — structurally impossible to set to `true` in TypeScript
2. **Encryption before persistence** — contract enforced; live KMS deferred to deployment
3. **AES-256-GCM expectation** — encryption algorithm explicitly specified in contract
4. **Key rotation 90-day cadence** — documented expectation, not enforced at contract layer
5. **No token logging** — governance boundary listed on every token operation

## Connector Isolation Decisions

1. **5-layer isolation validation** — tenant, workspace, provider, replay, session all evaluated independently
2. **Violation escalation** — single violation = `partial`, multiple = `violated`
3. **Session boundary enforcement** — cross-tenant session access produces `crossTenantLeakRisk: "high"`

## Replay Decisions

1. **Replay requires active session** — no replay authorization without a live, token-bearing session
2. **Workspace-scoped replay by default** — narrowest safe scope
3. **Cross-tenant replay hard-denied** — tenant mismatch → `unauthorized` regardless of session state
4. **`redacted` visibility** for cross-tenant access attempts — no data leakage

---

## Remaining Production Risks

| Risk | Severity | Notes |
|------|----------|-------|
| No live KMS integration | High | Token encryption is contract-only; AES-256-GCM requires deployment-time KMS wiring |
| No live token exchange | High | OAuth callback produces governance contract; provider SDK token exchange not implemented |
| No live DB persistence | High | Token persistence is semantic-only; encrypted DB backend required |
| No live provider health probe | Medium | Observability freshness is session-derived; external probe needed for real provider health |
| In-process OAuth state store | Medium | `oauth-state-validation.ts` uses in-process Map; Redis or equivalent required for multi-instance deployment |
| No token rotation event tracking | Low | Refresh token rotation requires event bus integration |
| No webhook signature verification | Medium | Addressed in Prompt 6.2 |
| No live ingestion | High | Addressed in Prompt 6.2 |

---

## Next Recommended Prompt

**Prompt 6.2 — Live Connector Ingestion, Webhooks & Realtime Operational Federation**

Build on authenticated federation to add:
- Live webhook registration per authenticated connector
- Webhook signature verification (provider-specific HMAC: Jira, Slack, GitHub, etc.)
- Realtime signal ingestion pipeline from authenticated connectors
- Webhook event routing and classification
- Authenticated signal federation into operational memory
- Live operational memory population from authenticated webhook signals
- Webhook delivery guarantees and retry semantics
- Webhook governance: tenant-bound delivery, workspace-scoped signal routing
